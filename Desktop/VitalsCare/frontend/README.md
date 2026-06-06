# VitalsCare — NCD Health Risk Radar

**VitalsCare** is an AI-powered health risk screening platform for Non-Communicable Diseases (NCDs) like hypertension, diabetes, and cardiovascular disease, with full Bengali language support.

## Features

- 🤖 **XGBoost ML** risk prediction engine
- 📚 **RAG Pipeline** with live WHO guidelines
- 🕸️ **Knowledge Graph** reasoning
- ☁️ **Gemini AI** personalized recommendations
- 🌐 **Bengali (বাংলা) & English** support
- 📊 **Risk trend dashboard** with historical analysis
- 🏥 **Clinic locator & referral booking**

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+

### Setup

1. **Install frontend dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Install backend dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

3. **Configure environment variables:**

   Copy `.env.example` to `.env.local` in the `frontend/` directory and fill in your Gemini API key:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

   Set your `GEMINI_API_KEY` in the backend environment:
   ```bash
   export GEMINI_API_KEY="your_gemini_api_key_here"
   ```

4. **Start the backend:**
   ```bash
   cd backend
   python app.py
   ```

5. **Start the frontend dev server:**
   ```bash
   cd frontend
   npm run dev
   ```

The app will be available at `http://localhost:5173`. The Vite dev server proxies all `/api/*` requests to the Python backend on port `8000`.

## Project Structure

```
VitalsCare/
├── backend/          # FastAPI backend
│   ├── app.py        # API endpoints
│   ├── ml_models.py  # XGBoost risk models
│   ├── rag_pipeline.py
│   ├── gemini_engine.py
│   ├── personalization.py
│   └── who_data/     # WHO fact sheets
└── frontend/         # React + Vite frontend
    └── src/
        ├── App.tsx
        └── components/
```
