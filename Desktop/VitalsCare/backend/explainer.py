"""Explainability helper for VitalsCare health risk assessments.

Translates XGBoost model probabilities and clinical factors into natural language
explanations tailored for community health workers and patients in English and Bengali.
"""
from __future__ import annotations

from typing import Dict, Any


def explain_risk(disease: str, risk_data: Dict[str, Any], patient: dict, lang: str = "en") -> str:
    """Constructs a simple, patient-facing explanation of the calculated risk."""
    factors = risk_data.get("contributing_factors") or []
    prob = risk_data.get("probability", 0.0)
    level = risk_data.get("risk_level", "low")
    
    # Disease translation lookup table
    disease_bn = {
        "hypertension": "উচ্চ রক্তচাপ (Hypertension)",
        "diabetes": "ডায়াবেটিস (Diabetes)",
        "heart_disease": "হৃদরোগ (Heart Disease)"
    }
    
    disease_name = disease_bn.get(disease.lower(), disease) if lang == "bn" else disease.capitalize()
    
    # Check if there are no major risk factors
    if not factors or factors[0].get("input") == "none":
        if lang == "bn":
            return f"আপনার {disease_name} এর ঝুঁকি কম ({prob:.1f}%)। কোনো জটিল ক্ষতিকারক কারণ পাওয়া যায়নি।"
        return f"Your risk for {disease_name} is low ({prob:.1f}%). No major risk factors were detected."
        
    reasons = [f.get("reason") for f in factors if f.get("reason")]
    
    if lang == "bn":
        # Map reasons to localized Bengali translations
        reasons_bn = []
        for r in reasons:
            r_lower = r.lower()
            if "elevated blood pressure" in r_lower or "high blood pressure" in r_lower:
                reasons_bn.append("রক্তচাপ বৃদ্ধি")
            elif "obesity" in r_lower or "overweight" in r_lower:
                reasons_bn.append("অতিরিক্ত ওজন বা বিএমআই (BMI)")
            elif "smoking" in r_lower:
                reasons_bn.append("ধূমপানের অভ্যাস")
            elif "salt" in r_lower:
                reasons_bn.append("লবণাক্ত খাবার গ্রহণ")
            elif "family history" in r_lower:
                reasons_bn.append("পারিবারিক রোগের ইতিহাস")
            elif "sedentary" in r_lower or "activity" in r_lower:
                reasons_bn.append("শারীরিক পরিশ্রমের ঘাটতি")
            elif "diet" in r_lower:
                reasons_bn.append("অস্বাস্থ্যকর খাদ্যাভ্যাস")
            elif "aging" in r_lower or "age" in r_lower:
                reasons_bn.append("বয়স বৃদ্ধি")
            elif "stress" in r_lower:
                reasons_bn.append("মানসিক চাপ")
            else:
                reasons_bn.append(r)
                
        factors_str = " এবং ".join(reasons_bn[:2]) if len(reasons_bn) > 1 else reasons_bn[0]
        return f"আপনার {disease_name} এর ঝুঁকি {prob:.1f}% ({level} ঝুঁকি)। এর প্রধান কারণ হলো: {factors_str}।"
    else:
        factors_str = " and ".join(reasons[:2]) if len(reasons) > 1 else reasons[0]
        return f"Your risk for {disease_name} is {prob:.1f}% ({level} risk), primarily driven by: {factors_str}."
