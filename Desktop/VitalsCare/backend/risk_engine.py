"""Explainable health risk scoring for a community screening prototype.

This module keeps the logic intentionally transparent for hackathon use.
It scores Hypertension and Diabetes separately with rule-based thresholds,
then returns one overall risk result that can be serialized to JSON.
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Tuple


RISK_BANDS: Tuple[Tuple[int, str, str], ...] = (
    (34, "Low", "Green"),
    (69, "Medium", "Yellow"),
    (100, "High", "Red"),
)

ACTIVITY_MAP = {"low": 1, "medium": 2, "high": 3}
DIET_MAP = {"poor": 1, "average": 2, "good": 3}


def _coerce_int(value: Any, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be an integer") from exc


def _coerce_float(value: Any, field_name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a number") from exc


def _coerce_bool(value: Any, field_name: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "yes", "y", "1"}:
            return True
        if normalized in {"false", "no", "n", "0"}:
            return False
    if isinstance(value, (int, float)):
        return bool(value)
    raise ValueError(f"{field_name} must be a boolean value")


def _normalize_choice(value: Any, field_name: str, mapping: Mapping[str, int]) -> int:
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in mapping:
            return mapping[normalized]
    if isinstance(value, (int, float)):
        integer_value = int(value)
        if integer_value in mapping.values():
            return integer_value
    raise ValueError(f"{field_name} must be one of: {', '.join(mapping.keys())}")


def _risk_band(score: int) -> Tuple[str, str]:
    for upper_bound, risk_level, color_code in RISK_BANDS:
        if score <= upper_bound:
            return risk_level, color_code
    return "High", "Red"


def _collect_hypertension_factors(
    *,
    age: int,
    systolic_bp: int,
    diastolic_bp: int,
    bmi: float,
    family_history: bool,
    activity_level: int,
    diet_quality: int,
) -> List[Dict[str, Any]]:
    factors: List[Dict[str, Any]] = []

    # Blood pressure is the dominant driver for hypertension in this prototype.
    if systolic_bp >= 160 or diastolic_bp >= 100:
        factors.append({"input": "systolic_bp/diastolic_bp", "points": 45, "reason": "Severely elevated blood pressure"})
    elif systolic_bp >= 140 or diastolic_bp >= 90:
        factors.append({"input": "systolic_bp/diastolic_bp", "points": 35, "reason": "Stage-2 level blood pressure"})
    elif systolic_bp >= 130 or diastolic_bp >= 80:
        factors.append({"input": "systolic_bp/diastolic_bp", "points": 20, "reason": "Elevated blood pressure"})

    if age >= 60:
        factors.append({"input": "age", "points": 10, "reason": "Hypertension risk rises with older age"})
    elif age >= 45:
        factors.append({"input": "age", "points": 6, "reason": "Midlife age contributes modest risk"})

    if bmi >= 30:
        factors.append({"input": "bmi", "points": 8, "reason": "Obesity raises hypertension risk"})
    elif bmi >= 25:
        factors.append({"input": "bmi", "points": 4, "reason": "Overweight status adds cardiovascular strain"})

    if family_history:
        factors.append({"input": "family_history", "points": 10, "reason": "Family history of hypertension or stroke"})

    if activity_level == 1:
        factors.append({"input": "activity_level", "points": 8, "reason": "Low physical activity"})

    if diet_quality == 1:
        factors.append({"input": "diet_quality", "points": 6, "reason": "High-salt or poor-quality diet"})

    return factors


def _collect_diabetes_factors(
    *,
    age: int,
    bmi: float,
    family_history: bool,
    activity_level: int,
    diet_quality: int,
) -> List[Dict[str, Any]]:
    factors: List[Dict[str, Any]] = []

    # BMI and family history are the main drivers for diabetes in this prototype.
    if bmi >= 35:
        factors.append({"input": "bmi", "points": 30, "reason": "Severe obesity is a strong diabetes risk factor"})
    elif bmi >= 30:
        factors.append({"input": "bmi", "points": 24, "reason": "Obesity increases insulin resistance"})
    elif bmi >= 25:
        factors.append({"input": "bmi", "points": 15, "reason": "Overweight status increases metabolic risk"})

    if family_history:
        factors.append({"input": "family_history", "points": 20, "reason": "Family history of diabetes"})

    if age >= 55:
        factors.append({"input": "age", "points": 10, "reason": "Diabetes risk rises with age"})
    elif age >= 45:
        factors.append({"input": "age", "points": 6, "reason": "Midlife age adds modest diabetes risk"})

    if activity_level == 1:
        factors.append({"input": "activity_level", "points": 12, "reason": "Low physical activity"})
    elif activity_level == 2:
        factors.append({"input": "activity_level", "points": 6, "reason": "Moderate activity is less protective than high activity"})

    if diet_quality == 1:
        factors.append({"input": "diet_quality", "points": 10, "reason": "Poor diet quality can worsen glucose control"})
    elif diet_quality == 2:
        factors.append({"input": "diet_quality", "points": 5, "reason": "Average diet quality offers only partial protection"})

    return factors


def _build_recommendation(condition: str, dominant_factor: str) -> str:
    if condition == "Hypertension":
        if dominant_factor == "systolic_bp/diastolic_bp":
            return "Repeat blood pressure measurement after 5 minutes of rest and arrange a same-week clinic review if readings stay above 140/90."
        if dominant_factor == "diet_quality":
            return "Start a low-salt meal plan today and avoid packaged snacks and salty pickles for the next 7 days."
        if dominant_factor == "activity_level":
            return "Walk briskly for 30 minutes a day, 5 days a week, unless a clinician has restricted activity."
        if dominant_factor == "family_history":
            return "Book a blood pressure screening within 1 week because family history raises baseline risk."
        return "Track blood pressure twice daily for 7 days and bring the log to a local clinic visit."

    if dominant_factor == "bmi":
        return "Schedule a fasting glucose or HbA1c test this month and start a structured weight-management plan with portion control."
    if dominant_factor == "family_history":
        return "Arrange a diabetes screening soon and share your family history with the health worker."
    if dominant_factor == "activity_level":
        return "Add a 20-30 minute walk after meals on at least 5 days each week to improve insulin sensitivity."
    if dominant_factor == "diet_quality":
        return "Replace sugary drinks with water today and keep starch portions to one fist per meal."
    return "Get a routine glucose screening and keep a food-and-activity log for the next 2 weeks."


def calculate_risk(patient_data: dict) -> dict:
    """Calculate an explainable, rule-based health risk summary.

    Required keys in `patient_data`:
    - age (int)
    - systolic_bp (int)
    - diastolic_bp (int)
    - bmi (float)
    - family_history (bool)
    - activity_level (str: low/medium/high)
    - diet_quality (str: poor/average/good)
    """

    age = _coerce_int(patient_data.get("age"), "age")
    systolic_bp = _coerce_int(patient_data.get("systolic_bp"), "systolic_bp")
    diastolic_bp = _coerce_int(patient_data.get("diastolic_bp"), "diastolic_bp")
    bmi = _coerce_float(patient_data.get("bmi"), "bmi")
    family_history = _coerce_bool(patient_data.get("family_history"), "family_history")
    activity_level = _normalize_choice(patient_data.get("activity_level"), "activity_level", ACTIVITY_MAP)
    diet_quality = _normalize_choice(patient_data.get("diet_quality"), "diet_quality", DIET_MAP)

    hypertension_factors = _collect_hypertension_factors(
        age=age,
        systolic_bp=systolic_bp,
        diastolic_bp=diastolic_bp,
        bmi=bmi,
        family_history=family_history,
        activity_level=activity_level,
        diet_quality=diet_quality,
    )
    diabetes_factors = _collect_diabetes_factors(
        age=age,
        bmi=bmi,
        family_history=family_history,
        activity_level=activity_level,
        diet_quality=diet_quality,
    )

    hypertension_score = min(100, sum(item["points"] for item in hypertension_factors))
    diabetes_score = min(100, sum(item["points"] for item in diabetes_factors))

    if hypertension_score >= diabetes_score:
        dominant_condition = "Hypertension"
        risk_score = hypertension_score
        contributing_factors = hypertension_factors
    else:
        dominant_condition = "Diabetes"
        risk_score = diabetes_score
        contributing_factors = diabetes_factors

    risk_level, color_code = _risk_band(risk_score)
    dominant_factor = contributing_factors[0]["input"] if contributing_factors else "none"

    return {
        "risk_level": risk_level,
        "color_code": color_code,
        "risk_score": risk_score,
        "dominant_condition": dominant_condition,
        "condition_scores": {
            "Hypertension": hypertension_score,
            "Diabetes": diabetes_score,
        },
        "contributing_factors": contributing_factors,
        "recommendation": _build_recommendation(dominant_condition, dominant_factor),
    }


if __name__ == "__main__":
    sample = {
        "age": 52,
        "systolic_bp": 146,
        "diastolic_bp": 94,
        "bmi": 29.4,
        "family_history": True,
        "activity_level": "low",
        "diet_quality": "poor",
    }
    import json

    print(json.dumps(calculate_risk(sample), indent=2))
