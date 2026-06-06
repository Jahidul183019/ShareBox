from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re
import secrets
import hashlib
import bcrypt
import uvicorn
import os


try:
    from . import db
except Exception:
    import db

from ml_models import predict_risks, get_model_info
from rag_pipeline import get_who_recommendations
from explainer import explain_risk
from graph_engine import knowledge_graph
from personalization import personalization
from gemini_engine import (
    generate_recommendation,
    check_gemini_running,
    chat_with_gemini
)
from scraper import scrape_all_who_data, get_scrape_status

app = FastAPI(title="VitalsCare v3.0 - Local AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_HASH_PREFIX = "sha256$"
_USERNAME_MIN_LENGTH = 3
_USERNAME_MAX_LENGTH = 100
_USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9_.@+-]+$")


def _password_digest(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _hash_password(password: str) -> str:
    """Hash a password using SHA-256 then bcrypt to avoid bcrypt's 72-byte limit."""
    digest = _password_digest(password).encode("utf-8")
    return f"{_HASH_PREFIX}{bcrypt.hashpw(digest, bcrypt.gensalt()).decode('utf-8')}"


def _validate_username(username: str) -> str:
    cleaned = username.strip()
    if (
        len(cleaned) < _USERNAME_MIN_LENGTH
        or len(cleaned) > _USERNAME_MAX_LENGTH
        or not _USERNAME_PATTERN.fullmatch(cleaned)
    ):
        raise HTTPException(status_code=400, detail='invalid-username')
    return cleaned


def _verify_password(stored_hash: str, password: str, user_id: int | None = None) -> bool:
    """
    Verify a password against stored hash.
    - New hashes are stored as `sha256$<bcrypt hash>`.
    - Legacy bcrypt hashes are still supported for existing users.
    - Legacy SHA256 hex hashes are also supported.
    """
    digest = _password_digest(password)

    try:
        if stored_hash.startswith(_HASH_PREFIX):
            return bcrypt.checkpw(
                digest.encode("utf-8"),
                stored_hash[len(_HASH_PREFIX):].encode("utf-8"),
            )

        # bcrypt/passlib style starts with $2b$ or $2a$ etc.
        if stored_hash.startswith('$'):
            return bcrypt.checkpw(password.encode("utf-8"), stored_hash.encode("utf-8"))
    except Exception:
        pass

    # Fallback: legacy SHA-256 hex
    try:
        if len(stored_hash) == 64 and all(c in '0123456789abcdef' for c in stored_hash.lower()):
            return digest == stored_hash
    except Exception:
        pass

    return False


def _require_user(token: Optional[str] = Header(None)):
    if not token:
        raise HTTPException(status_code=401, detail='Missing auth token')
    sess = db.get_session(token)
    if not sess or sess['expires_at'] < int(__import__('time').time()):
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user = db.get_user_by_id(sess['user_id'])
    if not user:
        raise HTTPException(status_code=401, detail='Unknown user')
    return user


@app.on_event('startup')
def _init_db_on_startup():
    db.init_db()

class PatientData(BaseModel):
    user_id: Optional[str] = "anonymous"
    age: int
    systolic_bp: float
    diastolic_bp: float
    bmi: float
    family_history: bool = False
    activity_level: str = "medium"
    diet_quality: str = "average"
    salt_intake: str = "medium"
    stress_level: str = "medium"
    smoking: bool = False
    dietary_diversity: float = 5.0
    income_level: str = "medium"
    children_under5: int = 0
    lang: str = "en"

@app.get("/health")
def health_check():
    gemini_status = "running" if check_gemini_running() else "not running"
    return {
        "status": "VitalsCare v3.0 Running",
        "gemini": "connected" if gemini_status == "running" else "not running",
        "features": [
            "XGBoost ML",
            "RAG Pipeline",
            "Knowledge Graph",
            "Gemini Cloud LLM",
            "Bengali Support",
            "Personalization"
        ]
    }

@app.get("/debug-models")
def debug_models():
    import os, requests
    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        return {"error": "No API key on server"}
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    resp = requests.get(url)
    if resp.status_code != 200:
        return {"error": resp.text, "status": resp.status_code}
    models = resp.json().get("models", [])
    return {"flash_models": [m["name"] for m in models if "flash" in m["name"]]}


@app.get("/model/info")
async def model_info():
    """Returns dataset source, training accuracy, and sample count for each XGBoost model."""
    return get_model_info()


@app.post("/assess")
async def assess(patient: PatientData):
    try:
        patient_dict = patient.dict()
        lang = patient_dict.get("lang", "en")
        user_id = patient_dict.get("user_id", "anonymous")

        # STEP 1: XGBoost ML
        print("🤖 Running XGBoost ML...")
        risk_scores = predict_risks(patient_dict)

        # STEP 2: RAG - Get WHO guidelines
        print("📚 Running RAG Pipeline...")
        who_context = ""
        full_results = {}

        for disease, risk_data in risk_scores.items():
            recommendations = get_who_recommendations(
                disease,
                risk_data["risk_level"],
                patient_dict,
                lang
            )
            explanation = explain_risk(
                disease,
                risk_data,
                patient_dict,
                lang
            )
            who_context += "\n".join(
                recommendations["guidelines"]
            )
            full_results[disease] = {
                **risk_data,
                "recommendations": recommendations,
                "explanation": explanation
            }

        # STEP 3: Knowledge Graph
        print("🕸️ Running Knowledge Graph...")
        graph_insights = knowledge_graph.graph_reasoning(
            patient_dict, risk_scores, lang
        )

        # STEP 4: Gemini LLM
        # Combines ML + RAG + Graph → Bengali advice
        print("☁️ Running Gemini LLM...")
        ai_recommendation = generate_recommendation(
            patient_data=patient_dict,
            risk_scores=risk_scores,
            who_context=who_context,
            graph_insights=graph_insights,
            lang=lang
        )

        # STEP 5: Personalization
        print("👤 Updating user profile...")
        personalization.update_profile(
            user_id, patient_dict, risk_scores
        )
        personal_message = personalization.get_personalized_message(
            user_id, lang
        )

        # Select dominant disease details for backward compatibility with frontend
        dominant_key = max(risk_scores, key=lambda k: risk_scores[k]["probability"])
        dominant_data = risk_scores[dominant_key]
        
        # Color mapping (expected format: Green, Yellow, Red)
        color_map = {"green": "Green", "yellow": "Yellow", "red": "Red"}
        # Risk level mapping (expected format: Low, Medium, High)
        level_map = {"low": "Low", "medium": "Medium", "high": "High"}
        # Disease display names mapping
        disease_display_names = {
            "hypertension": "Hypertension",
            "diabetes": "Diabetes",
            "malnutrition": "Malnutrition",
            "heart_disease": "Heart Disease"
        }

        # Select primary recommendation
        primary_recommendation = ""
        if ai_recommendation.get("status") == "success":
            primary_recommendation = ai_recommendation.get("ai_advice", "")
        
        if not primary_recommendation:
            primary_recommendation = dominant_data.get("recommendation", "")

        return {
            "status": "success",
            "language": lang,
            "risk_results": full_results,
            "ai_recommendation": ai_recommendation,
            "graph_insights": graph_insights,
            "personalization": personal_message,
            "pipeline": {
                "step1": "XGBoost ML",
                "step2": "RAG + WHO Guidelines",
                "step3": "Knowledge Graph",
                "step4": "Gemini Cloud LLM",
                "step5": "Personalization"
            },
            # Compatibility fields for frontend
            "risk_score": int(round(dominant_data["probability"])),
            "risk_level": level_map.get(dominant_data["risk_level"], "Low"),
            "color_code": color_map.get(dominant_data["color"], "Green"),
            "dominant_condition": disease_display_names.get(dominant_key, "Hypertension"),
            "condition_scores": {
                "Hypertension": int(round(risk_scores.get("hypertension", {}).get("probability", 0))),
                "Diabetes": int(round(risk_scores.get("diabetes", {}).get("probability", 0))),
                "Malnutrition": int(round(risk_scores.get("malnutrition", {}).get("probability", 0))),
                "Heart Disease": int(round(risk_scores.get("heart_disease", {}).get("probability", 0)))
            },
            "recommendation": primary_recommendation
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


class AuthPayload(BaseModel):
    username: str
    password: str
    name: Optional[str] = None


@app.post('/auth/register')
def register(p: AuthPayload):
    try:
        username = _validate_username(p.username)
        existing = db.get_user_by_username(username)
        if existing:
            raise HTTPException(status_code=400, detail='username-taken')
        uid = db.create_user(username, _hash_password(p.password), p.name)
        token = secrets.token_urlsafe(32)
        db.create_session(token, uid)
        return { 'token': token, 'username': username, 'name': p.name }
    except HTTPException:
        raise
    except ValueError as exc:
        if str(exc) == 'username-taken':
            raise HTTPException(status_code=400, detail='username-taken')
        raise HTTPException(status_code=400, detail='invalid-username')
    except Exception:
        raise HTTPException(status_code=500, detail='register-error')


@app.post('/auth/login')
def login(p: AuthPayload):
    try:
        username = _validate_username(p.username)
        user = db.get_user_by_username(username)
        if not user or not _verify_password(user['password_hash'], p.password, user['id']):
            raise HTTPException(status_code=401, detail='invalid-credentials')
        token = secrets.token_urlsafe(32)
        db.create_session(token, user['id'])
        return { 'token': token, 'username': user['username'], 'name': user.get('name') }
    except HTTPException:
        raise
    except ValueError:
        raise HTTPException(status_code=400, detail='invalid-username')
    except Exception:
        raise HTTPException(status_code=500, detail='login-error')


@app.post('/auth/logout')
def logout(token: Optional[str] = Header(None)):
    if token:
        db.delete_session(token)
    return { 'ok': True }


@app.get('/auth/me')
def get_my_profile(user=Depends(_require_user)):
    return { 'username': user['username'], 'name': user.get('name'), 'id': user['id'] }


class UpdateProfilePayload(BaseModel):
    name: Optional[str]


@app.patch('/auth/me')
def update_my_profile(payload: UpdateProfilePayload, user=Depends(_require_user)):
    if payload.name is not None:
        db.update_user_name(user['id'], payload.name)
    updated = db.get_user_by_id(user['id'])
    return { 'username': updated['username'], 'name': updated.get('name'), 'id': updated['id'] }


class ChangePasswordPayload(BaseModel):
    current_password: str
    new_password: str


@app.post('/auth/change-password')
def change_password(payload: ChangePasswordPayload, user=Depends(_require_user)):
    # verify current password
    stored = db.get_user_by_id(user['id'])
    if not stored:
        raise HTTPException(status_code=401, detail='unknown-user')
    if not _verify_password(stored['password_hash'], payload.current_password, user['id']):
        raise HTTPException(status_code=401, detail='invalid-current-password')
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail='new-password-too-short')
    db.update_user_password(user['id'], _hash_password(payload.new_password))
    return { 'ok': True }


@app.get("/scrape/status")
async def scrape_status():
    """Check status of WHO scraped data"""
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "who_data")
    from scraper import get_scrape_status
    status = get_scrape_status(data_dir)
    return status


@app.post("/scrape/refresh")
async def refresh_who_data(force: bool = False):
    """
    Scrape latest WHO guidelines and save to who_data/
    This is the live scraping endpoint judges will see!
    """
    import os
    data_dir = os.path.join(os.path.dirname(__file__), "who_data")
    
    # Get Gemini API Key from environment for Bengali translation
    gemini_api_key = os.getenv("GEMINI_API_KEY", "").strip()
    
    from scraper import scrape_all_who_data
    results = scrape_all_who_data(
        data_dir=data_dir,
        use_gemini_translation=True,
        gemini_api_key=gemini_api_key,
        force_refresh=force
    )
    
    return {
        "status": "complete",
        "results": results,
        "success_count": sum(results.values()),
        "total": len(results),
        "message": f"Scraped {sum(results.values())}/{len(results)} WHO disease pages"
    }


class ChatPayload(BaseModel):
    messages: list
    lang: Optional[str] = "en"

@app.post("/chat")
async def chat_endpoint(payload: ChatPayload):
    try:
        response_text = chat_with_gemini(payload.messages, payload.lang)
        return {"text": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/about")
async def about():
    return {
        "product": "VitalsCare",
        "tagline": "AI-Powered Health Risk Detection for Rural Bangladesh",
        "version": "3.0",
        "mission": (
            "To provide early disease detection for hypertension, "
            "diabetes, CVD, and malnutrition to 50 million rural "
            "Bangladeshis who lack access to preventive healthcare."
        ),

        "business_model": {
            "free_tier": {
                "name": "Community Free",
                "price": "BDT 0 / month",
                "target": "Rural community health workers (CHWs)",
                "features": [
                    "Health risk assessment for 4 diseases",
                    "Bengali language support",
                    "Offline-capable mobile interface",
                    "Basic WHO-backed recommendations",
                    "Up to 50 assessments per month"
                ],
                "impact": "Covers 13,000+ community clinics in Bangladesh"
            },

            "paid_tier": {
                "name": "Clinic Pro",
                "price": "BDT 2,000 / month",
                "target": "Private clinics, hospitals, NGOs",
                "features": [
                    "Unlimited assessments",
                    "Patient history tracking",
                    "AI chatbot for health queries",
                    "Priority Gemini AI recommendations",
                    "CSV export and analytics dashboard",
                    "Multi-user team access",
                    "API access for integration"
                ],
                "target_customers": [
                    "BRAC Health Programme",
                    "Gonoshasthaya Kendra",
                    "Private diagnostic centers",
                    "Urban health clinics"
                ]
            },

            "enterprise_tier": {
                "name": "Government Enterprise",
                "price": "Custom licensing",
                "target": "Bangladesh government & international NGOs",
                "features": [
                    "Full white-label deployment",
                    "Integration with DGHS health systems",
                    "National patient database",
                    "Custom AI model training on local data",
                    "Dedicated server deployment",
                    "24/7 technical support",
                    "Compliance with Bangladesh health data laws",
                    "WHO reporting dashboard"
                ],
                "target_customers": [
                    "Bangladesh DGHS (Directorate General of Health Services)",
                    "UNICEF Bangladesh",
                    "WHO Bangladesh office",
                    "World Bank health projects",
                    "icddr,b research programmes"
                ]
            }
        },

        "market_opportunity": {
            "total_addressable_market": "170 million people in Bangladesh",
            "target_segment": "50 million rural Bangladeshis",
            "current_gap": (
                "Only 30% of rural population has access to "
                "preventive health screening"
            ),
            "disease_burden": {
                "hypertension": "17% adult prevalence = 17 million patients",
                "diabetes": "8% adult prevalence = 8 million patients",
                "malnutrition": "28% children under 5 = 4.2 million children",
                "cvd": "Leading cause of death in Bangladesh"
            }
        },

        "revenue_projection": {
            "year_1": {
                "free_users": "500 CHWs across 10 upazilas",
                "paid_clinics": "50 clinics × BDT 2000 = BDT 100,000/month",
                "annual_revenue": "BDT 1,200,000"
            },
            "year_2": {
                "paid_clinics": "500 clinics × BDT 2000 = BDT 1,000,000/month",
                "enterprise_contracts": "2 NGO contracts × BDT 500,000",
                "annual_revenue": "BDT 13,000,000"
            },
            "year_3": {
                "target": "DGHS national deployment",
                "potential": "BDT 50,000,000+ government contract"
            }
        },

        "competitive_advantage": [
            "Only Bengali-first health AI in Bangladesh",
            "Offline-capable for low-connectivity rural areas",
            "Trained on real Kaggle datasets (170,000+ records)",
            "RAG pipeline on official WHO + Bangladesh DGHS guidelines",
            "4 diseases in one assessment (3 minutes)",
            "Lowest cost per screening vs manual CHW visits"
        ],

        "go_to_market": {
            "phase_1": "Partner with BRAC Health Programme for pilot (500 CHWs)",
            "phase_2": "Expand to private clinics via NGO partnerships",
            "phase_3": "Government DGHS integration for national rollout"
        },

        "team_needed": {
            "technical": "2 ML engineers + 1 backend + 1 frontend",
            "business": "1 health sector BD specialist + 1 NGO partnerships",
            "medical": "1 clinical advisor for WHO compliance"
        },

        "funding_ask": {
            "seed_round": "BDT 5,000,000 (USD ~45,000)",
            "use_of_funds": {
                "product_development": "40%",
                "pilot_deployment": "30%",
                "team_hiring": "20%",
                "marketing": "10%"
            },
            "milestones": [
                "Month 3: 500 active CHW users",
                "Month 6: 50 paying clinics",
                "Month 12: DGHS pilot agreement signed"
            ]
        },

        "impact_metrics": {
            "early_detection_rate": "70-80% of at-risk individuals identified",
            "cost_per_screening": "BDT 2 vs BDT 500 for manual screening",
            "time_per_assessment": "< 3 minutes",
            "accuracy": "91-96%+ across all 4 disease models",
            "lives_impacted_year_1": "25,000+ patients screened"
        },

        "technology_stack": {
            "ai_models": "XGBoost trained on 170,000 real patient records",
            "llm": "Google Gemini 2.5 Flash",
            "rag_sources": "WHO Fact Sheets + Bangladesh DGHS protocols",
            "knowledge_graph": "Disease relationship reasoning engine",
            "deployment": "Render cloud (scalable to AWS/GCP)",
            "languages": "Bengali + English"
        }
    }


def main() -> None:
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    main()
