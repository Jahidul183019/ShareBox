import requests
import os
import time

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
CHATBOT_API_KEY = os.getenv("CHATBOT_API_KEY", GEMINI_API_KEY).strip()

_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta"
    "/models/gemini-2.0-flash:generateContent"
)
_GEMINI_MODEL_URL = (
    "https://generativelanguage.googleapis.com/v1beta"
    "/models/gemini-2.0-flash"
)

MAX_RETRIES = 3


# =========================
# INTERNAL RETRY HELPER
# =========================
def _call_gemini(payload: dict, timeout: int = 15, api_key: str = None, model: str = "gemini-2.0-flash") -> dict | None:
    """
    POST to the Gemini API with exponential-backoff retry on 429 / transient errors.

    Returns the parsed JSON response dict on success, or None after all retries fail.
    Raises ValueError for non-retryable API errors (4xx other than 429).
    """
    key = api_key or GEMINI_API_KEY
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"

    for attempt in range(MAX_RETRIES):
        try:
            response = requests.post(
                url,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=timeout,
            )

            # ── Quota / rate-limit: back off and retry ────────────────────────
            if response.status_code == 429:
                wait = 2 ** attempt          # 1s → 2s → 4s
                print(f"[gemini] ⚠️  Quota exceeded (attempt {attempt + 1}/{MAX_RETRIES}), "
                      f"waiting {wait}s…")
                time.sleep(wait)
                continue

            # ── Server errors (5xx): retry with backoff ───────────────────────
            if response.status_code >= 500:
                wait = 2 ** attempt
                print(f"[gemini] ⚠️  Server error {response.status_code} "
                      f"(attempt {attempt + 1}/{MAX_RETRIES}), waiting {wait}s…")
                time.sleep(wait)
                continue

            # ── Non-retryable client errors ───────────────────────────────────
            if response.status_code != 200:
                err_msg = response.json().get("error", {}).get("message", "Unknown Error")
                raise ValueError(f"Gemini API Error {response.status_code}: {err_msg}")

            # ── Success ───────────────────────────────────────────────────────
            return response.json()

        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as exc:
            wait = 2 ** attempt
            print(f"[gemini] ⚠️  Network error (attempt {attempt + 1}/{MAX_RETRIES}): "
                  f"{exc}. Retrying in {wait}s…")
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)
            else:
                print("[gemini] ❌ All retries exhausted (network error).")
                return None

        except ValueError:
            # Non-retryable — bubble up immediately
            raise

        except Exception as exc:
            print(f"[gemini] ⚠️  Unexpected error (attempt {attempt + 1}): {exc}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** attempt)
            else:
                return None

    print("[gemini] ❌ All retries exhausted.")
    return None


def _extract_text(data: dict) -> str:
    """Safely extract the text field from a Gemini response dict."""
    try:
        return (
            data.get("candidates", [])[0]
            .get("content", {})
            .get("parts", [])[0]
            .get("text", "")
        )
    except (IndexError, AttributeError):
        return ""


# =========================
# MAIN AI GENERATION
# =========================
def generate_recommendation(
    patient_data: dict,
    risk_scores: dict,
    who_context: str,
    graph_insights: dict,
    lang: str = "en",
) -> dict:

    language_instruction = (
        "Respond entirely in Bengali (বাংলা) script."
        if lang == "bn"
        else "Respond in simple English."
    )

    prompt = f"""
You are VitalsCare AI, a medical assistant 
for rural Bangladesh health workers.

{language_instruction}

PATIENT PROFILE:
- Age: {patient_data.get('age')} years
- BMI: {patient_data.get('bmi')}
- Blood Pressure: {patient_data.get('systolic_bp')}/{patient_data.get('diastolic_bp')} mmHg
- Activity: {patient_data.get('activity_level')}
- Diet: {patient_data.get('diet_quality')}
- Smoking: {patient_data.get('smoking')}
- Family History: {patient_data.get('family_history')}
- Income: {patient_data.get('income_level')}

ML RISK SCORES:
{risk_scores}

WHO GUIDELINES:
{who_context}

KNOWLEDGE GRAPH INSIGHTS:
{graph_insights}

Provide:
1. Simple 2-line summary
2. Top 3 actions
3. Bangladesh food advice
4. Doctor warning

Max 150 words.
"""

    if not GEMINI_API_KEY:
        return {
            "ai_advice": get_fallback_advice(risk_scores, lang),
            "model": "fallback",
            "language": lang,
            "status": "error",
            "error": "GEMINI_API_KEY is not set.",
        }

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 512, "temperature": 0.2},
    }

    try:
        data = _call_gemini(payload, timeout=15)

        if data is None:
            # All retries exhausted
            return {
                "ai_advice": get_fallback_advice(risk_scores, lang),
                "model": "fallback",
                "language": lang,
                "status": "quota_exceeded",
            }

        ai_text = _extract_text(data)
        return {
            "ai_advice": ai_text,
            "model": "gemini-2.0-flash",
            "language": lang,
            "status": "success",
        }

    except ValueError as exc:
        # Non-retryable API error
        return {
            "ai_advice": get_fallback_advice(risk_scores, lang),
            "model": "fallback",
            "language": lang,
            "status": "error",
            "error": str(exc),
        }
    except Exception as exc:
        return {
            "ai_advice": get_fallback_advice(risk_scores, lang),
            "model": "fallback",
            "language": lang,
            "status": "error",
            "error": str(exc),
        }


# =========================
# RISK EXPLANATION
# =========================
def explain_risk_with_gemini(
    disease: str,
    risk_level: str,
    factors: list,
    lang: str = "en",
) -> str:

    language_instruction = (
        "Respond in Bengali (বাংলা)."
        if lang == "bn"
        else "Respond in simple English."
    )

    prompt = f"""
{language_instruction}

Patient has {risk_level} risk for {disease}.
Factors: {factors}

Explain in 2 simple sentences.
No medical jargon.
"""

    _fallback = f"{disease} risk is {risk_level} based on health data."

    if not GEMINI_API_KEY:
        return _fallback

    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"maxOutputTokens": 100, "temperature": 0.2},
    }

    try:
        data = _call_gemini(payload, timeout=10)
        if data is None:
            return _fallback
        return _extract_text(data) or _fallback
    except Exception:
        return _fallback


# =========================
# CHECK GEMINI STATUS
# =========================
def check_gemini_running() -> bool:
    if not GEMINI_API_KEY:
        return False
    try:
        url = f"{_GEMINI_MODEL_URL}?key={GEMINI_API_KEY}"
        r = requests.get(url, timeout=5)
        return r.status_code == 200
    except Exception:
        return False


# =========================
# FALLBACK ADVICE
# =========================
def get_fallback_advice(risk_scores: dict, lang: str) -> str:

    high_risks = [
        d for d, v in risk_scores.items()
        if v.get("risk_level") == "high"
    ]

    if lang == "bn":
        if high_risks:
            return (
                f"আপনার {', '.join(high_risks)}-এর উচ্চ ঝুঁকি আছে। "
                f"দয়া করে ডাক্তারের পরামর্শ নিন।"
            )
        return "আপনার স্বাস্থ্য ঝুঁকি কম। সুস্থ জীবনযাপন চালিয়ে যান।"
    else:
        if high_risks:
            return f"High risk detected for {', '.join(high_risks)}. Please consult a doctor."
        return "Your health risk is low. Keep maintaining healthy habits."


# =========================
# CHATBOT ASSISTANT
# =========================
def chat_with_gemini(messages: list, lang: str = "en") -> str:
    system_instruction = f"""
    You are VitalCare Assistant, an empathetic, highly specialized and professional medical information assistant for non-communicable disease (NCD) preventative screening in Bangladesh. 

    CRITICAL HEALTHCARE BOT RULES:
    - Maintain a humble, professional, clear, and clinical precision tone at all times.
    - Encourage healthy diets (low-salt, low-starch, whole foods), exercise, and routine medical evaluations.
    - You must always state that your advice is for informational and screening awareness purposes only, and cannot substitute for a licensed professional physician or formal medical diagnosis.
    - Keep your paragraphs clear, readable, and highly focused. Limit responses to around 150-200 words.
    """

    if lang == "bn":
        system_instruction += (
            "\n- If the user asks in Bengali (বাংলা), respond in perfect, "
            "warm and natural Bengali. E.g., using polite 'আপনি' address."
        )

    _offline_bn = (
        "আমি বর্তমানে অফলাইন মুডে চলছি কারণ সার্ভার সম্পূর্ণ লোড হচ্ছে। "
        "একটি সক্রিয় এআই উত্তর পেতে আপনি আমাদের 'Assess' স্ক্রীনিং প্রোগ্রামটি চালু করতে পারেন!"
    )
    _offline_en = (
        "I am currently running in Offline mode as the server has not fully loaded. "
        "To see a dynamic response, you can launch the Screening Assessment program!"
    )

    if not CHATBOT_API_KEY:
        return _offline_bn if lang == "bn" else _offline_en

    # Map message history to Gemini format
    formatted_contents = []
    for m in messages:
        role = "user" if m.get("sender") == "user" else "model"
        formatted_contents.append({
            "role": role,
            "parts": [{"text": m.get("text", "")}],
        })

    payload = {
        "contents": formatted_contents,
        "systemInstruction": {
            "role": "user",
            "parts": [{"text": system_instruction}],
        },
        "generationConfig": {"maxOutputTokens": 1024, "temperature": 0.3},
    }

    try:
        data = _call_gemini(payload, timeout=15)

        if data is None:
            # All retries exhausted
            err = "quota_exceeded or network error after 3 retries"
            if lang == "bn":
                return f"দুঃখিত, এআই সার্ভারটি বর্তমানে উপলব্ধ নেই। ({err})"
            return (
                "AI service is temporarily unavailable (rate limit or network error). "
                "Please try again in a moment."
            )

        return _extract_text(data)

    except ValueError as exc:
        print(f"[gemini] Chat non-retryable error: {exc}")
        if lang == "bn":
            return f"দুঃখিত, এআই সার্ভারটি বর্তমানে উপলব্ধ নেই। ({str(exc)})"
        return (
            f"AI service is currently unavailable. "
            f"Please verify your GEMINI_API_KEY settings or try again later. "
            f"Error details: {str(exc)}"
        )
    except Exception as exc:
        print(f"[gemini] Chatbot unexpected error: {exc}")
        if lang == "bn":
            return f"দুঃখিত, এআই সার্ভারটি বর্তমানে উপলব্ধ নেই। ({str(exc)})"
        return (
            f"AI service is currently unavailable. "
            f"Please verify your GEMINI_API_KEY settings or try again later. "
            f"Error details: {str(exc)}"
        )