# VitalsCare v3.0 — Backend

AI-powered community health risk assessment API for rural Bangladesh.
Accepts patient vitals and lifestyle inputs, returns risk scores, WHO-backed recommendations, and Gemini AI advice — in English and Bengali.

---

## Architecture — 5-Step Pipeline

Every `POST /assess` call runs through:

```
Patient Input
     │
     ▼
┌─────────────────────────────────────┐
│  Step 1 — XGBoost ML               │  ml_models.py
│  Real Kaggle datasets (171,069 rows)│
│  Diabetes · CVD · HTN · Malnutrition│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 2 — RAG Pipeline              │  rag_pipeline.py
│  WHO guidelines + BD DGHS PDFs      │  who_data/
│  Retrieves disease-specific context │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 3 — Knowledge Graph           │  graph_engine.py
│  Maps risk factor interactions      │
│  Uncovers comorbidity patterns      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 4 — Gemini 2.5 Flash LLM     │  gemini_engine.py
│  Synthesizes ML + RAG + Graph       │
│  Retry logic: 3 attempts, backoff   │
│  Fallback advice on quota exceeded  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Step 5 — Personalization Engine    │  personalization.py
│  User history · trend tracking      │
│  Personalized micro-suggestions     │
└──────────────┴──────────────────────┘
               │
               ▼
          JSON Response
```

---

## ML Models — Real Kaggle Datasets

All 4 XGBoost models are trained on **real patient data** (no synthetic data):

| Disease | Dataset | Records | Accuracy | Source |
|---|---|---|---|---|
| Diabetes | `diabetes_prediction_dataset.csv` | 100,000 | **97.26%** | [Kaggle — iammustafatz](https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset) |
| CVD / Heart | `heart.csv` | 918 | **74.46%** | [Kaggle — fedesoriano](https://www.kaggle.com/datasets/fedesoriano/heart-failure-prediction) |
| Hypertension | `hypertension_dataset.csv` | 1,186 | **74.79%** | [Kaggle — miadul](https://www.kaggle.com/datasets/miadul/hypertension-risk-prediction-dataset) |
| Malnutrition | `cardio_train.csv` (BMI proxy) | 69,965 | **99.83%** | [Kaggle — sulianova](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset) |

CSV files live in `backend/datasets/`. Trained models are cached in `backend/datasets/trained_models/` via `joblib` — auto-loaded on restart, retrained if deleted.

---

## Project Structure

```
backend/
├── app.py                  ← FastAPI app, all routes
├── ml_models.py            ← XGBoost training + prediction (real Kaggle data)
├── gemini_engine.py        ← Gemini API with retry/backoff logic
├── rag_pipeline.py         ← RAG: reads who_data/ PDFs + text files
├── graph_engine.py         ← Knowledge graph reasoning
├── personalization.py      ← User history + personalized messages
├── explainer.py            ← Risk factor explanation helper
├── scraper.py              ← WHO website scraper
├── risk_engine.py          ← Rule-based risk scoring helper
├── db.py                   ← SQLite / PostgreSQL database layer
├── requirements.txt
│
├── datasets/               ← Kaggle CSV files + trained models
│   ├── diabetes_prediction_dataset.csv
│   ├── heart.csv
│   ├── hypertension_dataset.csv
│   ├── cardio_train.csv
│   ├── README.md           ← Dataset column mapping docs
│   └── trained_models/     ← Cached .joblib model files
│       ├── diabetes.joblib
│       ├── cvd.joblib
│       ├── hypertension.joblib
│       └── malnutrition.joblib
│
└── who_data/               ← WHO + BD DGHS guidelines (feeds RAG)
    ├── who_*.txt           ← Scraped guidelines (EN + BN)
    ├── bd_dghs_*.pdf       ← Bangladesh DGHS PDFs
    └── scrape_metadata.json
```

---

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Set environment variables
```bash
# Required for AI recommendations
export GEMINI_API_KEY=your_gemini_api_key_here

# Optional — defaults to local SQLite if not set
export DATABASE_URL=postgresql://user:pass@host/db
```

Or use a `local.env` file and load it:
```bash
set -a && source local.env && set +a
```

### 3. Run locally
```bash
cd backend/
uvicorn app:app --reload --port 8000
```

### 4. Verify it's working
```bash
curl http://localhost:8000/health
# → {"status": "VitalsCare v3.0 Running", "gemini": "connected", ...}
```

---

## API Endpoints

### Core

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Server status + Gemini connection check |
| `POST` | `/assess` | Full 5-step risk assessment |
| `POST` | `/chat` | Gemini-powered chatbot (EN + BN) |

### ML Models
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/model/info` | Dataset source, accuracy, sample count per model |

### WHO Data
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/scrape/status` | Check freshness of scraped WHO data |
| `POST` | `/scrape/refresh` | Re-scrape latest WHO guidelines |

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Create account |
| `POST` | `/auth/login` | Login → returns token |
| `POST` | `/auth/logout` | Invalidate session |
| `GET` | `/auth/me` | Get current user profile |
| `PATCH` | `/auth/me` | Update display name |
| `POST` | `/auth/change-password` | Change password |

### Debug
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/debug-models` | List available Gemini models for configured API key |

---

## POST /assess — Request Format

```json
{
  "age": 52,
  "systolic_bp": 146,
  "diastolic_bp": 94,
  "bmi": 29.4,
  "family_history": true,
  "activity_level": "low",
  "diet_quality": "poor",
  "smoking": true,
  "salt_intake": "high",
  "stress_level": "high",
  "dietary_diversity": 4.5,
  "income_level": "medium",
  "children_under5": 1,
  "lang": "en"
}
```

**Field reference:**

| Field | Type | Values |
|---|---|---|
| `age` | int | — |
| `systolic_bp` | float | mmHg |
| `diastolic_bp` | float | mmHg |
| `bmi` | float | — |
| `family_history` | bool | — |
| `activity_level` | string | `low` · `medium` · `high` |
| `diet_quality` | string | `poor` · `average` · `good` |
| `smoking` | bool | — |
| `salt_intake` | string | `low` · `medium` · `high` |
| `stress_level` | string | `low` · `medium` · `high` |
| `dietary_diversity` | float | 0 – 10 |
| `income_level` | string | `low` · `medium` · `high` |
| `children_under5` | int | — |
| `lang` | string | `en` · `bn` |

---

## GET /model/info — Response Example

```json
{
  "models": {
    "diabetes":     { "source": "real", "accuracy": 0.9726, "n_samples": 100000, "cached": true },
    "cvd":          { "source": "real", "accuracy": 0.7446, "n_samples": 918,    "cached": true },
    "hypertension": { "source": "real", "accuracy": 0.7479, "n_samples": 1186,   "cached": true },
    "malnutrition": { "source": "real", "accuracy": 0.9983, "n_samples": 69965,  "cached": true }
  },
  "summary": {
    "total_models": 4,
    "real_datasets": 4,
    "synthetic_datasets": 0
  }
}
```

---

## Gemini Retry Logic

`gemini_engine.py` uses exponential backoff on all API calls:

```
Attempt 1 → 429 quota → wait 1s
Attempt 2 → 429 quota → wait 2s
Attempt 3 → 429 quota → wait 4s → fallback advice returned
```

Handles: `429 Quota`, `5xx Server errors`, `Network timeouts`, `Connection errors`.
On total failure: returns rule-based fallback advice (never crashes the `/assess` response).

---

## Database

| Env var | Behaviour |
|---|---|
| `DATABASE_URL` not set | SQLite file: `backend/data.sqlite3` |
| `DATABASE_URL=postgresql://...` | PostgreSQL (Render production) |

---

## Deployment (Render)

Set these environment variables on Render:
```
GEMINI_API_KEY   = your_key
DATABASE_URL     = postgresql://...   (auto-set by Render Postgres addon)
```

Start command:
```bash
gunicorn app:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:$PORT
```

---

## Retrain Models from Scratch

```bash
# Delete cached models
rm backend/datasets/trained_models/*.joblib

# Models retrain automatically on next server start
uvicorn app:app --reload
```

---

> **Disclaimer:** VitalsCare is a research and screening awareness tool.
> It is not a substitute for licensed medical diagnosis or clinical care.
