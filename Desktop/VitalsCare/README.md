# VitalsCare v3.0 - Local AI

Backend-plus-frontend prototype for Infinity AI BuildFest 2026.

This project is a comprehensive HealthTech demo for rural community screening. It includes authentication, a profile page, an assessment form, a risk insights dashboard, and a Gemini-powered conversational AI assistant.

## New in v3.0

- **XGBoost ML Classification**: Predicts risks for Hypertension, Diabetes, Cardiovascular Disease (CVD), and Malnutrition using real-world clinical datasets.
- **Gemini Cloud LLM**: Provides personalized, culturally-aware health advice in both English and Bengali.
- **RAG Pipeline**: Retrieves and utilizes clinical guidelines directly from WHO/DGHS documents to ground the AI's recommendations.
- **Knowledge Graph**: Adds logical reasoning over the predicted risks to identify multi-morbidity interactions.
- **Bilingual Support**: Full UI and AI responses support English and Bengali (বাংলা).

## Project Structure

```text
VitalsCare/
├── backend/
│   ├── app.py                 # Main FastAPI application
│   ├── ml_models.py           # XGBoost training and inference
│   ├── gemini_engine.py       # Gemini API integration (advice & chatbot)
│   ├── rag_pipeline.py        # WHO guidelines retrieval
│   ├── graph_engine.py        # Knowledge graph reasoning
│   ├── scraper.py             # WHO data scraper
│   ├── db.py                  # Database connection logic
│   ├── datasets/              # Clinical datasets and trained .joblib models
│   ├── who_data/              # Scraped WHO guidelines for RAG
│   └── requirements.txt
├── frontend/
│   ├── src/                   # React components (Vite + TailwindCSS)
│   ├── server.ts              # Express/Vite server for frontend
│   ├── package.json
│   └── vite.config.ts
├── start.sh                   # Startup script for both servers
└── local.env                  # Local environment variables (GEMINI_API_KEY)
```

## What the Backend Does

- Exposes a **FastAPI** app with CORS enabled.
- Runs patient data through the **XGBoost ML** models.
- Queries the **RAG Pipeline** for relevant WHO guidelines based on predicted diseases.
- Passes ML results and WHO guidelines to the **Gemini AI** to generate a final personalized recommendation.
- Handles user authentication (login, register, session management) using SQLite (or PostgreSQL via `DATABASE_URL`).
- Exposes a conversational `/chat` endpoint for the Health Agent.

## Frontend

The `frontend/` folder contains the React UI layer. It calls the backend via API and renders:

- Landing page and Authentication screens.
- Clinical assessment form with dynamic field capture.
- Risk Dashboard displaying color-coded results, contributing factors, and AI-generated advice.
- Floating **Health Agent** chatbot.

## Local Setup

From the project root, install dependencies if needed:

```bash
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

Ensure you have a `.env` or `local.env` file with your Gemini API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Run the App

```bash
bash start.sh
```

This starts both services concurrently:

- **Frontend**: `http://localhost:5173/` (or port 3000 depending on Vite/Node)
- **Backend**: `http://127.0.0.1:8000/`

## Test the API

**Health check:**
```bash
curl http://127.0.0.1:8000/health
```

**Sample risk request:**
```bash
curl -X POST http://127.0.0.1:8000/assess \
  -H 'Content-Type: application/json' \
  -d '{
    "age": 52,
    "systolic_bp": 146,
    "diastolic_bp": 94,
    "bmi": 29.4,
    "family_history": true,
    "activity_level": "low",
    "diet_quality": "poor",
    "lang": "en"
  }'
```

## Notes

- This is a prototype and **not a clinical diagnostic tool**.
- The ML models use a combination of real Kaggle datasets and synthetic fallback data.
- The Gemini AI responses are strictly for informational and screening awareness purposes.
- Set `DATABASE_URL` to enable the Postgres-backed runtime in production environments.
