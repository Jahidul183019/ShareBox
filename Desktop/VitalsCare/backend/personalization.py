"""Personalization module with persistent profile store.

Used by the app to update and fetch simple personalized messages.
"""
from __future__ import annotations

import json
from typing import Dict, Any
from db import get_conn, _USE_POSTGRES

try:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS profiles (
            user_id TEXT PRIMARY KEY,
            patient_data TEXT,
            risk_scores TEXT,
            updated_at TEXT
        )
    ''')
    conn.commit()
    conn.close()
except Exception as e:
    print("Warning: Could not create profiles table:", e)

class _Personalization:
    @staticmethod
    def update_profile(user_id: str, patient_data: dict, risk_scores: dict) -> None:
        import datetime
        now = datetime.datetime.now().isoformat()
        try:
            conn = get_conn()
            cur = conn.cursor()
            
            p_data_str = json.dumps(patient_data)
            r_scores_str = json.dumps(risk_scores)
            
            if _USE_POSTGRES:
                cur.execute(
                    'INSERT INTO profiles(user_id, patient_data, risk_scores, updated_at) VALUES (%s, %s, %s, %s) ON CONFLICT (user_id) DO UPDATE SET patient_data = EXCLUDED.patient_data, risk_scores = EXCLUDED.risk_scores, updated_at = EXCLUDED.updated_at',
                    (user_id, p_data_str, r_scores_str, now)
                )
            else:
                cur.execute(
                    'INSERT OR REPLACE INTO profiles(user_id, patient_data, risk_scores, updated_at) VALUES (?, ?, ?, ?)',
                    (user_id, p_data_str, r_scores_str, now)
                )
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error updating profile: {e}")

    @staticmethod
    def get_personalized_message(user_id: str, lang: str = "en") -> Dict[str, str]:
        profile = None
        try:
            conn = get_conn()
            if _USE_POSTGRES:
                import psycopg2.extras
                cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
                cur.execute('SELECT patient_data, risk_scores FROM profiles WHERE user_id = %s', (user_id,))
                row = cur.fetchone()
            else:
                cur = conn.cursor()
                cur.execute('SELECT patient_data, risk_scores FROM profiles WHERE user_id = ?', (user_id,))
                row = cur.fetchone()
            conn.close()
            
            if row:
                profile = {
                    "patient": json.loads(row["patient_data"]),
                    "risk": json.loads(row["risk_scores"])
                }
        except Exception as e:
            print(f"Error fetching profile: {e}")

        if not profile:
            return {"message": "No personalization available." if lang == "en" else "কোনো ব্যক্তিগতকরণ উপলব্ধ নেই।"}
            
        patient = profile.get("patient", {})
        suggestions_en = []
        suggestions_bn = []
        
        if patient.get("smoking") is True:
            suggestions_en.append("quit smoking to improve cardiovascular health")
            suggestions_bn.append("হৃদযন্ত্রের স্বাস্থ্য উন্নত করতে ধূমপান ত্যাগ করুন")
            
        systolic = patient.get("systolic_bp", 0)
        diastolic = patient.get("diastolic_bp", 0)
        if systolic > 140 or diastolic > 90:
            suggestions_en.append("regularly monitor your blood pressure and consult a doctor")
            suggestions_bn.append("নিয়মিত রক্তচাপ মাপুন এবং ডাক্তারের পরামর্শ নিন")
            
        if patient.get("bmi", 0) > 25.0:
            suggestions_en.append("manage weight through a balanced diet")
            suggestions_bn.append("সুষম খাদ্যের মাধ্যমে ওজন নিয়ন্ত্রণে রাখুন")
            
        if patient.get("salt_intake") == "high":
            suggestions_en.append("reduce dietary salt intake")
            suggestions_bn.append("খাবারে লবণের পরিমাণ কমান")
            
        if patient.get("activity_level") == "low":
            suggestions_en.append("engage in at least 30 minutes of daily physical activity")
            suggestions_bn.append("প্রতিদিন অন্তত ৩০ মিনিট শারীরিক ব্যায়াম করুন")
            
        if patient.get("stress_level") == "high":
            suggestions_en.append("practice mindfulness or relaxation techniques")
            suggestions_bn.append("মানসিক চাপ কমাতে ধ্যানের অভ্যাস করুন")
            
        # Limit to top 2 priority suggestions
        suggestions_en = suggestions_en[:2]
        suggestions_bn = suggestions_bn[:2]
        
        if not suggestions_en:
            if lang == "bn":
                return {"message": "আপনার ব্যক্তিগত সুপারিশ: স্বাস্থ্যকর জীবনযাপন বজায় রাখুন।"}
            return {"message": "Personalized suggestion: maintain a healthy lifestyle."}
            
        if lang == "bn":
            message = "আপনার ব্যক্তিগত সুপারিশ: " + " এবং ".join(suggestions_bn) + "।"
        else:
            message = "Personalized suggestion: " + " and ".join(suggestions_en) + "."
            
        return {"message": message}


personalization = _Personalization()
