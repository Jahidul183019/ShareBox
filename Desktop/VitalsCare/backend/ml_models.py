"""XGBoost risk classification models for VitalsCare community health screening.

This module loads real Kaggle datasets (with synthetic fallback) and trains
separate XGBoost classifiers for Hypertension, Diabetes, CVD, and Malnutrition.
Trained models are persisted to datasets/trained_models/ via joblib.
"""
from __future__ import annotations

import os
import warnings
import numpy as np
import xgboost as xgb
from typing import Dict, Any

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────────────────────────────────────
# Paths
# ─────────────────────────────────────────────────────────────────────────────
_BASE_DIR = os.path.dirname(__file__)
_DATASETS_DIR = os.path.join(_BASE_DIR, "datasets")
_MODELS_DIR = os.path.join(_DATASETS_DIR, "trained_models")

os.makedirs(_MODELS_DIR, exist_ok=True)

# ─────────────────────────────────────────────────────────────────────────────
# Global state
# ─────────────────────────────────────────────────────────────────────────────
# { disease: xgb.XGBClassifier }
_models: Dict[str, xgb.XGBClassifier] = {}

# { disease: { "source": "real"/"synthetic", "accuracy": float, "n_samples": int, "url": str } }
_model_info: Dict[str, Dict[str, Any]] = {}

# Dataset source URLs
_DATASET_URLS: Dict[str, str] = {
    "diabetes": "https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset",
    "cvd": "https://www.kaggle.com/datasets/fedesoriano/heart-failure-prediction",
    "hypertension": "https://www.kaggle.com/datasets/miadul/hypertension-risk-prediction-dataset",
    "malnutrition": "synthetic — no public Kaggle dataset available",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helper: safe pandas import
# ─────────────────────────────────────────────────────────────────────────────
def _try_import_pandas():
    try:
        import pandas as pd
        return pd
    except ImportError:
        return None


def _try_import_joblib():
    try:
        import joblib
        return joblib
    except ImportError:
        return None


def _smart_sample(X, y, max_samples=20000):
    """
    Smart stratified sampling — keeps class balance
    Much better than random sampling
    """
    if len(X) <= max_samples:
        return X, y  # No sampling needed
    
    try:
        from sklearn.model_selection import train_test_split
        # Stratified = keeps same ratio of sick/healthy
        _, X_sample, _, y_sample = train_test_split(
            X, y,
            test_size=max_samples/len(X),
            stratify=y,      # ← KEY: keeps disease ratio
            random_state=42
        )
        print(f"✂️ Stratified sample: {len(X)} → {len(X_sample)} rows")
        return X_sample, y_sample
    except:
        # Random fallback
        idx = np.random.choice(len(X), max_samples, replace=False)
        return X[idx], y[idx]


# ─────────────────────────────────────────────────────────────────────────────
# DATASET 1 — Diabetes
# ─────────────────────────────────────────────────────────────────────────────
def _load_diabetes_dataset():
    """
    Load diabetes_prediction_dataset.csv.
    Actual columns: gender, age, hypertension, heart_disease, smoking_history,
                    bmi, HbA1c_level, blood_glucose_level, diabetes
    Target: diabetes (0/1)
    Returns (X, y) as numpy arrays or (None, None) on failure.
    """
    pd = _try_import_pandas()
    if pd is None:
        print("[ml_models] ⚠️  pandas not available — using synthetic data for diabetes")
        return None, None

    path = os.path.join(_DATASETS_DIR, "diabetes_prediction_dataset.csv")
    if not os.path.isfile(path):
        print(f"[ml_models] ⚠️  diabetes dataset not found at {path} — using synthetic fallback")
        return None, None

    try:
        df = pd.read_csv(path)
        df = df.dropna()

        # Map smoking_history: current / ever / former → 1, else → 0
        smoking_map = {"current": 1, "ever": 1, "former": 1}
        df["smoking_int"] = df["smoking_history"].map(
            lambda x: smoking_map.get(str(x).lower(), 0)
        )

        # Derive activity_level from blood_glucose_level
        # >200 → 0 (low), >140 → 1 (medium), else → 2 (high)
        df["activity_level_int"] = df["blood_glucose_level"].apply(
            lambda g: 0 if g > 200 else (1 if g > 140 else 2)
        )

        # Actual column names in this Kaggle dataset
        feature_cols = [
            "age", "bmi", "HbA1c_level", "blood_glucose_level",
            "hypertension", "heart_disease", "smoking_int", "activity_level_int"
        ]
        # Check all required columns exist
        missing = [c for c in feature_cols if c not in df.columns]
        if missing:
            print(f"[ml_models] ⚠️  diabetes CSV missing columns {missing} — using synthetic fallback")
            return None, None

        if "diabetes" not in df.columns:
            print("[ml_models] ⚠️  diabetes CSV missing target column 'diabetes' — using synthetic fallback")
            return None, None

        X = df[feature_cols].values.astype(float)
        y = df["diabetes"].values.astype(int)
        print(f"[ml_models] ✅ Loaded REAL diabetes dataset — {len(df):,} samples")
        return X, y
    except Exception as exc:
        print(f"[ml_models] ⚠️  Failed to parse diabetes CSV: {exc} — using synthetic fallback")
        return None, None


# ─────────────────────────────────────────────────────────────────────────────
# DATASET 2 — CVD (Heart Disease)
# ─────────────────────────────────────────────────────────────────────────────
def _load_cvd_dataset():
    """
    Load heart.csv (fedesoriano heart-failure-prediction dataset).
    Actual columns: Age, Sex, ChestPainType, RestingBP, Cholesterol, FastingBS,
                    RestingECG, MaxHR, ExerciseAngina, Oldpeak, ST_Slope, HeartDisease
    Also tries cardio_train.csv (semicolon-separated, 70k rows) as fallback.
    Target: HeartDisease (0/1)
    """
    pd = _try_import_pandas()
    if pd is None:
        print("[ml_models] ⚠️  pandas not available — using synthetic data for CVD")
        return None, None

    # Primary: fedesoriano heart.csv
    path = os.path.join(_DATASETS_DIR, "heart.csv")
    if os.path.isfile(path):
        try:
            df = pd.read_csv(path)
            df = df.dropna()

            # Derive activity_level from MaxHR: >150=2, >100=1, else=0
            df["activity_level_int"] = df["MaxHR"].apply(
                lambda hr: 2 if hr > 150 else (1 if hr > 100 else 0)
            )

            # Map ExerciseAngina: Y=1, N=0
            df["exercise_angina_int"] = df["ExerciseAngina"].map(
                lambda x: 1 if str(x).upper() == "Y" else 0
            )

            feature_cols = [
                "Age", "RestingBP", "Cholesterol", "FastingBS",
                "MaxHR", "exercise_angina_int", "Oldpeak", "activity_level_int"
            ]
            missing = [c for c in feature_cols if c not in df.columns]
            if not missing and "HeartDisease" in df.columns:
                X = df[feature_cols].values.astype(float)
                y = df["HeartDisease"].values.astype(int)
                print(f"[ml_models] ✅ Loaded REAL CVD dataset (heart.csv) — {len(df):,} samples")
                return X, y
            print(f"[ml_models] ⚠️  heart.csv missing columns {missing} — trying cardio_train fallback")
        except Exception as exc:
            print(f"[ml_models] ⚠️  Failed to parse heart.csv: {exc} — trying cardio_train fallback")

    # Secondary: cardio_train.csv (semicolon-separated, age in days)
    cardio_path = os.path.join(_DATASETS_DIR, "cardio_train.csv")
    if os.path.isfile(cardio_path):
        try:
            df = pd.read_csv(cardio_path, sep=";")
            df = df.dropna()
            # age is in days → convert to years
            df["age_years"] = (df["age"] / 365.25).round(1)
            # Derive activity_level from active column (1=active=high, 0=sedentary=low)
            df["activity_level_int"] = df["active"].apply(lambda a: 2 if a == 1 else 0)
            # ap_hi = systolic, ap_lo = diastolic
            feature_cols = [
                "age_years", "ap_hi", "cholesterol", "gluc",
                "smoke", "alco", "activity_level_int", "ap_lo"
            ]
            missing = [c for c in feature_cols if c not in df.columns]
            if not missing and "cardio" in df.columns:
                X = df[feature_cols].values.astype(float)
                y = df["cardio"].values.astype(int)
                print(f"[ml_models] ✅ Loaded REAL CVD dataset (cardio_train.csv) — {len(df):,} samples")
                return X, y
        except Exception as exc:
            print(f"[ml_models] ⚠️  Failed to parse cardio_train.csv: {exc} — using synthetic fallback")

    print(f"[ml_models] ⚠️  No CVD CSV found — using synthetic fallback")
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# DATASET 3 — Hypertension
# ─────────────────────────────────────────────────────────────────────────────
def _load_hypertension_dataset():
    """
    Load hypertension_data.csv (miadul dataset).
    Actual columns: Age, Salt_Intake, Stress_Score, BP_History, Sleep_Duration,
                    BMI, Medication, Family_History, Exercise_Level,
                    Smoking_Status, Has_Hypertension
    Target column: Has_Hypertension (Yes/No → 1/0)
    Also accepts 'target' column if present (alternate dataset format).
    """
    pd = _try_import_pandas()
    if pd is None:
        print("[ml_models] ⚠️  pandas not available — using synthetic data for hypertension")
        return None, None

    # Try both expected filenames
    for fname in ["hypertension_data.csv", "hypertension_dataset.csv"]:
        path = os.path.join(_DATASETS_DIR, fname)
        if os.path.isfile(path):
            try:
                df = pd.read_csv(path)
                df = df.dropna()

                # Detect target column — supports Has_Hypertension (Yes/No) or target (0/1)
                if "Has_Hypertension" in df.columns:
                    df["target"] = df["Has_Hypertension"].map(
                        lambda x: 1 if str(x).strip().lower() == "yes" else 0
                    )
                elif "target" not in df.columns:
                    print(f"[ml_models] ⚠️  {fname} has no recognisable target column — skipping")
                    continue

                # Map categorical columns to numeric
                col_maps = {
                    "BP_History":     {"normal": 0, "elevated": 1, "high": 2},
                    "Medication":     {"none": 0, "yes": 1, "no": 0},
                    "Family_History": {"yes": 1, "no": 0},
                    "Exercise_Level": {"low": 0, "moderate": 1, "high": 2},
                    "Smoking_Status": {"non-smoker": 0, "ex-smoker": 1, "smoker": 2,
                                       "never": 0, "former": 1, "current": 2},
                }
                for col, mapping in col_maps.items():
                    if col in df.columns:
                        df[col] = df[col].map(
                            lambda x, m=mapping: m.get(str(x).strip().lower(), 0)
                        )

                # Use all numeric-compatible columns except target & Has_Hypertension
                exclude = {"target", "Has_Hypertension"}
                feature_cols = [
                    c for c in df.columns
                    if c not in exclude
                    and df[c].dtype in [np.float64, np.int64, float, int]
                ]
                if len(feature_cols) == 0:
                    print(f"[ml_models] ⚠️  No numeric features in {fname} after mapping")
                    continue

                X = df[feature_cols].values.astype(float)
                y = df["target"].values.astype(int)
                print(f"[ml_models] ✅ Loaded REAL hypertension dataset ({fname}) — "
                      f"{len(df):,} samples, {len(feature_cols)} features: {feature_cols}")
                return X, y
            except Exception as exc:
                print(f"[ml_models] ⚠️  Failed to parse {fname}: {exc}")
                continue

    print("[ml_models] ⚠️  No hypertension CSV found — using synthetic fallback")
    return None, None


# ─────────────────────────────────────────────────────────────────────────────
# DATASET 4 — Malnutrition (cardio_train.csv with synthetic fallback)
# ─────────────────────────────────────────────────────────────────────────────
def _load_malnutrition_dataset():
    """
    Load malnutrition features from cardio_train.csv (Cardiovascular Disease Dataset).
    cardio_train.csv columns (semicolon-separated):
        id, age (days), gender, height (cm), weight (kg),
        ap_hi, ap_lo, cholesterol (1=normal,2=above,3=well above),
        gluc (1=normal,2=above,3=well above), smoke, alco, active, cardio

    Derived features for malnutrition:
        bmi              = weight / (height/100)^2
        dietary_diversity = approximated from cholesterol + gluc (higher = better diet proxy)
        income_level_int  = proxy from alco + active (active, non-alcohol = higher income)
        children_under5   = approximated from age group (younger adults in rural BD)
        age_years         = age / 365.25
        diet_quality_int  = proxy from gluc (normal=2, above=1, well_above=0)

    Malnutrition label:
        bmi < 18.5
        OR dietary_diversity_score < 4
        OR (income_proxy == 0 AND children_proxy > 2)
    """
    pd = _try_import_pandas()
    if pd is None:
        print("[ml_models] ⚠️  pandas not available — using synthetic data for malnutrition")
        return None, None

    path = os.path.join(_DATASETS_DIR, "cardio_train.csv")
    if not os.path.isfile(path):
        print(f"[ml_models] ⚠️  cardio_train.csv not found at {path} — using synthetic fallback")
        return None, None

    try:
        df = pd.read_csv(path, sep=";")
        df = df.dropna()

        required = {"age", "height", "weight", "cholesterol", "gluc", "smoke", "alco", "active"}
        missing = required - set(df.columns)
        if missing:
            print(f"[ml_models] ⚠️  cardio_train.csv missing columns {missing} — using synthetic fallback")
            return None, None

        # Filter out physiologically impossible values
        df = df[(df["height"] > 100) & (df["height"] < 250)]
        df = df[(df["weight"] > 20) & (df["weight"] < 250)]

        # Derived features
        df["bmi"] = df["weight"] / ((df["height"] / 100.0) ** 2)
        df["age_years"] = (df["age"] / 365.25).round(1)

        # dietary_diversity: cholesterol=1 + gluc=1 → good diversity (score 0-10)
        # Higher cholesterol/gluc levels ironically mean poorer diet (excess)
        # We invert: normal=3pts each → max 6, scale to 0-10
        df["dietary_diversity"] = (
            (4 - df["cholesterol"]) * 2.0 +   # normal chol=3→2pts, well_above=1→0pts
            (4 - df["gluc"]) * 1.5 +           # normal gluc=3→1.5pts
            df["active"] * 2.5                  # physically active adds 2.5
        ).clip(0, 10)

        # income_level proxy: active + not_alcohol + not_smoke → higher income proxy
        # 0=low, 1=medium, 2=high
        income_score = df["active"] + (1 - df["alco"]) + (1 - df["smoke"])
        df["income_level_int"] = pd.cut(income_score, bins=[-1, 0.9, 1.9, 3.1],
                                        labels=[0, 1, 2]).astype(int)

        # children_under5 proxy: younger adults (age 20-35) in rural context
        # more likely to have young children
        df["children_proxy"] = df["age_years"].apply(
            lambda a: 3 if a < 28 else (2 if a < 35 else (1 if a < 45 else 0))
        )

        # diet_quality: gluc normal=2 (good), above=1 (average), well_above=0 (poor)
        df["diet_quality_int"] = (3 - df["gluc"]).clip(0, 2)

        feature_cols = [
            "bmi", "dietary_diversity", "income_level_int",
            "children_proxy", "age_years", "diet_quality_int"
        ]

        # Malnutrition label matching original synthetic logic
        y = (
            (df["bmi"] < 18.5) |
            (df["dietary_diversity"] < 4.0) |
            ((df["income_level_int"] == 0) & (df["children_proxy"] > 2))
        ).astype(int)

        X = df[feature_cols].values.astype(float)
        print(f"[ml_models] ✅ Loaded REAL malnutrition dataset (cardio_train.csv) — "
              f"{len(df):,} samples | malnutrition prevalence: {y.mean()*100:.1f}%")
        return X, y.values

    except Exception as exc:
        print(f"[ml_models] ⚠️  Failed to parse cardio_train.csv for malnutrition: {exc} — using synthetic fallback")
        return None, None


def _generate_malnutrition_data(n_samples: int = 2000):
    """
    Synthetic malnutrition fallback for rural Bangladesh context.
    Features: bmi, dietary_diversity, income_level, children_under5, age, diet_quality
    Label: bmi < 18.5 OR dietary_diversity < 4 OR (income_level==0 AND children_under5 > 2)
    """
    np.random.seed(42)
    bmi = np.random.uniform(12.0, 38.0, size=n_samples)
    dietary_diversity = np.random.uniform(0.0, 10.0, size=n_samples)
    income_level = np.random.choice([0, 1, 2], p=[0.45, 0.35, 0.20], size=n_samples)
    children_under5 = np.random.randint(0, 6, size=n_samples)
    age = np.random.randint(18, 70, size=n_samples)
    diet_quality = np.random.choice([0, 1, 2], p=[0.30, 0.50, 0.20], size=n_samples)

    X = np.column_stack([
        bmi, dietary_diversity, income_level, children_under5, age, diet_quality
    ])
    y = (
        (bmi < 18.5) |
        (dietary_diversity < 4.0) |
        ((income_level == 0) & (children_under5 > 2))
    ).astype(int)

    print(f"[ml_models] 🔬 Using SYNTHETIC malnutrition fallback — {n_samples} samples")
    return X, y


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic fallback helpers per disease
# ─────────────────────────────────────────────────────────────────────────────
def _synthetic_diabetes(n_samples: int = 2000):
    """Synthetic diabetes data mimicking diabetes_prediction_dataset schema."""
    np.random.seed(42)
    age = np.random.randint(18, 85, size=n_samples).astype(float)
    bmi = np.random.uniform(15.0, 45.0, size=n_samples)
    hba1c = np.random.uniform(3.5, 9.0, size=n_samples)
    blood_glucose = np.random.uniform(70, 300, size=n_samples)
    hypertension = np.random.choice([0, 1], p=[0.75, 0.25], size=n_samples)
    heart_disease = np.random.choice([0, 1], p=[0.85, 0.15], size=n_samples)
    smoking_int = np.random.choice([0, 1], p=[0.70, 0.30], size=n_samples)
    activity_int = np.apply_along_axis(
        lambda g: 0 if g > 200 else (1 if g > 140 else 2), 0, blood_glucose.reshape(1, -1)
    ).flatten()

    X = np.column_stack([age, bmi, hba1c, blood_glucose, hypertension,
                          heart_disease, smoking_int, activity_int])
    score = (bmi - 25) * 1.5 + (age - 45) * 0.3 + hypertension * 20 - activity_int * 10
    y = (score > 10).astype(int)
    print(f"[ml_models] 🔬 Using SYNTHETIC diabetes fallback — {n_samples} samples")
    return X, y


def _synthetic_cvd(n_samples: int = 2000):
    """Synthetic CVD data mimicking heart.csv schema."""
    np.random.seed(42)
    age = np.random.randint(28, 80, size=n_samples).astype(float)
    resting_bp = np.random.randint(90, 200, size=n_samples).astype(float)
    cholesterol = np.random.randint(100, 600, size=n_samples).astype(float)
    fasting_bs = np.random.choice([0, 1], p=[0.75, 0.25], size=n_samples).astype(float)
    max_hr = np.random.randint(60, 200, size=n_samples).astype(float)
    exercise_angina = np.random.choice([0, 1], p=[0.65, 0.35], size=n_samples).astype(float)
    oldpeak = np.random.uniform(0.0, 6.2, size=n_samples)
    activity_int = np.where(max_hr > 150, 2, np.where(max_hr > 100, 1, 0)).astype(float)

    X = np.column_stack([age, resting_bp, cholesterol, fasting_bs,
                          max_hr, exercise_angina, oldpeak, activity_int])
    score = ((resting_bp - 120) * 0.4 + (age - 50) * 0.5 +
             exercise_angina * 25 + fasting_bs * 20 - activity_int * 8)
    y = (score > 20).astype(int)
    print(f"[ml_models] 🔬 Using SYNTHETIC CVD fallback — {n_samples} samples")
    return X, y


def _synthetic_hypertension(n_samples: int = 2000):
    """Synthetic hypertension data using the 8-feature schema we map to for prediction."""
    np.random.seed(42)
    age = np.random.randint(18, 85, size=n_samples).astype(float)
    systolic_bp = np.random.randint(90, 200, size=n_samples).astype(float)
    diastolic_bp = np.random.randint(60, 120, size=n_samples).astype(float)
    bmi = np.random.uniform(15.0, 42.0, size=n_samples)
    family_history = np.random.choice([0, 1], p=[0.70, 0.30], size=n_samples).astype(float)
    activity_level = np.random.choice([0, 1, 2], p=[0.30, 0.50, 0.20], size=n_samples).astype(float)
    salt_intake = np.random.choice([0, 1, 2], p=[0.20, 0.50, 0.30], size=n_samples).astype(float)
    stress_level = np.random.choice([0, 1, 2], p=[0.20, 0.60, 0.20], size=n_samples).astype(float)

    X = np.column_stack([age, systolic_bp, diastolic_bp, bmi,
                          family_history, activity_level, salt_intake, stress_level])
    score = ((systolic_bp - 120) * 0.5 + (diastolic_bp - 80) * 0.8 +
             (age - 40) * 0.2 + (bmi - 25) * 0.5 +
             family_history * 10 - activity_level * 5 + salt_intake * 8)
    y = (score > 15).astype(int)
    print(f"[ml_models] 🔬 Using SYNTHETIC hypertension fallback — {n_samples} samples")
    return X, y


# ─────────────────────────────────────────────────────────────────────────────
# load_datasets() — public API
# ─────────────────────────────────────────────────────────────────────────────
def load_datasets() -> Dict[str, tuple]:
    """
    Attempt to load each CSV dataset from the datasets/ folder.
    Falls back to synthetic data if any CSV is missing or malformed.

    Returns:
        dict of disease → (X, y, source_label)
        source_label: "real" or "synthetic"
    """
    results: Dict[str, tuple] = {}

    # --- Diabetes ---
    X_db, y_db = _load_diabetes_dataset()
    if X_db is not None:
        results["diabetes"] = (X_db, y_db, "real")
    else:
        X_db, y_db = _synthetic_diabetes()
        results["diabetes"] = (X_db, y_db, "synthetic")

    # --- CVD ---
    X_cvd, y_cvd = _load_cvd_dataset()
    if X_cvd is not None:
        results["cvd"] = (X_cvd, y_cvd, "real")
    else:
        X_cvd, y_cvd = _synthetic_cvd()
        results["cvd"] = (X_cvd, y_cvd, "synthetic")

    # --- Hypertension ---
    X_ht, y_ht = _load_hypertension_dataset()
    if X_ht is not None:
        results["hypertension"] = (X_ht, y_ht, "real")
    else:
        X_ht, y_ht = _synthetic_hypertension()
        results["hypertension"] = (X_ht, y_ht, "synthetic")

    # --- Malnutrition (cardio_train.csv with synthetic fallback) ---
    X_mn, y_mn = _load_malnutrition_dataset()
    if X_mn is not None:
        results["malnutrition"] = (X_mn, y_mn, "real")
    else:
        X_mn, y_mn = _generate_malnutrition_data()
        results["malnutrition"] = (X_mn, y_mn, "synthetic")

    return results


# ─────────────────────────────────────────────────────────────────────────────
# train_models() — public API
# ─────────────────────────────────────────────────────────────────────────────
def train_models() -> None:
    """
    Train one XGBoost model per disease. Results are cached in _models and
    persisted to datasets/trained_models/<disease>.joblib.
    Loads from disk cache if already trained.
    """
    global _models, _model_info

    joblib = _try_import_joblib()

    try:
        from sklearn.model_selection import train_test_split
        from sklearn.metrics import accuracy_score
    except ImportError as exc:
        print(f"[ml_models] ❌ scikit-learn not available: {exc}")
        return

    datasets = load_datasets()

    for disease, (X, y, source) in datasets.items():
        model_path = os.path.join(_MODELS_DIR, f"{disease}.joblib")

        # Load from disk cache if available
        if joblib is not None and os.path.isfile(model_path):
            try:
                model = joblib.load(model_path)
                _models[disease] = model
                # Recompute accuracy for info
                _, X_test, _, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
                preds = model.predict(X_test)
                acc = accuracy_score(y_test, preds)
                _model_info[disease] = {
                    "source": source,
                    "accuracy": round(float(acc), 4),
                    "n_samples": len(y),
                    "url": _DATASET_URLS.get(disease, "N/A"),
                    "cached": True,
                }
                print(f"[ml_models] 💾 Loaded cached {disease} model "
                      f"(acc={acc:.4f}, n={len(y)}, source={source})")
                continue
            except Exception as exc:
                print(f"[ml_models] ⚠️  Cache load failed for {disease}: {exc} — retraining")

        try:
            X, y = _smart_sample(X, y, max_samples=20000)
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )

            model = xgb.XGBClassifier(
                n_estimators=100,
                max_depth=4,
                learning_rate=0.1,
                subsample=0.8,
                colsample_bytree=0.8,
                random_state=42,
                eval_metric="logloss",
                use_label_encoder=False,
            )
            model.fit(X_train, y_train)

            preds = model.predict(X_test)
            acc = accuracy_score(y_test, preds)

            _models[disease] = model
            _model_info[disease] = {
                "source": source,
                "accuracy": round(float(acc), 4),
                "n_samples": len(y),
                "url": _DATASET_URLS.get(disease, "N/A"),
                "cached": False,
            }
            print(f"[ml_models] ✅ Trained {disease} model — "
                  f"acc={acc:.4f}, n={len(y)}, source={source}")

            # Persist to disk
            if joblib is not None:
                try:
                    joblib.dump(model, model_path)
                    print(f"[ml_models] 💾 Saved {disease} model → {model_path}")
                except Exception as exc:
                    print(f"[ml_models] ⚠️  Could not save {disease} model: {exc}")

        except Exception as exc:
            print(f"[ml_models] ❌ Training failed for {disease}: {exc}")


# ─────────────────────────────────────────────────────────────────────────────
# init_models() — backward-compatible entry point
# ─────────────────────────────────────────────────────────────────────────────
def init_models() -> None:
    """Train and cache all models. No-op if already trained."""
    if not _models:
        train_models()


# ─────────────────────────────────────────────────────────────────────────────
# Feature-vector builders per disease
# ─────────────────────────────────────────────────────────────────────────────
def _build_diabetes_features(p: dict, activity_int: int, smoking_int: int) -> np.ndarray:
    """
    Build 8-feature vector matching diabetes_prediction_dataset schema:
    [age, bmi, HbA1c_approx, blood_glucose_approx,
     hypertension_from_bp, heart_disease=0, smoking_int, activity_level_int]
    """
    age = float(p.get("age", 40))
    bmi = float(p.get("bmi", 23.0))
    diet_int = {"poor": 0, "average": 1, "good": 2}.get(
        str(p.get("diet_quality", "average")).lower(), 1
    )

    # Approximate HbA1c from BMI + age + diet
    # Higher BMI, older age, poor diet → higher HbA1c
    hba1c_approx = 4.5 + (bmi - 18.5) * 0.08 + (age - 20) * 0.02 + (2 - diet_int) * 0.4
    hba1c_approx = float(np.clip(hba1c_approx, 3.5, 14.0))

    # Approximate blood_glucose from diet + activity
    # Poor diet, low activity → higher glucose
    blood_glucose_approx = 90 + (2 - diet_int) * 30 + (2 - activity_int) * 25
    blood_glucose_approx = float(np.clip(blood_glucose_approx, 70, 350))

    systolic_bp = float(p.get("systolic_bp", 120))
    hypertension_from_bp = 1 if systolic_bp >= 140 else 0

    return np.array([[
        age, bmi, hba1c_approx, blood_glucose_approx,
        hypertension_from_bp, 0, smoking_int, activity_int
    ]])


def _build_cvd_features(p: dict, activity_int: int, smoking_int: int) -> np.ndarray:
    """
    Build 8-feature vector matching heart.csv schema:
    [Age, RestingBP, Cholesterol_approx, FastingBS_from_diet,
     MaxHR_approx, ExerciseAngina_approx, Oldpeak_approx, activity_level_int]
    """
    age = float(p.get("age", 40))
    systolic_bp = float(p.get("systolic_bp", 120))
    bmi = float(p.get("bmi", 23.0))
    diet_int = {"poor": 0, "average": 1, "good": 2}.get(
        str(p.get("diet_quality", "average")).lower(), 1
    )

    # Approximate cholesterol from BMI + age
    cholesterol_approx = 150 + (bmi - 18.5) * 5 + (age - 20) * 1.2
    cholesterol_approx = float(np.clip(cholesterol_approx, 100, 600))

    # Approximate max HR = 220 - age (standard formula)
    max_hr_approx = float(np.clip(220.0 - age, 60.0, 200.0))

    # FastingBS: if diet is poor and bmi is high, assume fasting BS ≥ 120
    fasting_bs = 1 if (diet_int == 0 and bmi > 27) else 0

    # Oldpeak approximated from stress + activity
    stress_int = {"low": 0, "medium": 1, "high": 2}.get(
        str(p.get("stress_level", "medium")).lower(), 1
    )
    oldpeak_approx = float(np.clip(stress_int * 0.8 + (2 - activity_int) * 0.5, 0.0, 6.2))

    # Exercise angina: low activity + high stress → more likely
    exercise_angina = 1 if (activity_int == 0 and stress_int == 2) else 0

    return np.array([[
        age, systolic_bp, cholesterol_approx, fasting_bs,
        max_hr_approx, exercise_angina, oldpeak_approx, activity_int
    ]])


def _build_hypertension_features(p: dict, activity_int: int) -> np.ndarray:
    """
    Build feature vector for hypertension model.
    If real dataset was loaded, the model was trained on all numeric columns of that CSV.
    We can't know those columns at predict time — so we fall back to the synthetic
    8-feature schema which the synthetic model was trained on:
    [age, systolic_bp, diastolic_bp, bmi, family_history, activity_level, salt_intake, stress_level]
    """
    age = float(p.get("age", 40))
    systolic_bp = float(p.get("systolic_bp", 120))
    diastolic_bp = float(p.get("diastolic_bp", 80))
    bmi = float(p.get("bmi", 23.0))
    family_history = 1.0 if p.get("family_history") else 0.0
    salt_int = {"low": 0, "medium": 1, "high": 2}.get(
        str(p.get("salt_intake", "medium")).lower(), 1
    )
    stress_int = {"low": 0, "medium": 1, "high": 2}.get(
        str(p.get("stress_level", "medium")).lower(), 1
    )

    # If the real dataset was used, its feature count may differ.
    # We detect this by checking the model's expected n_features.
    model = _models.get("hypertension")
    base_features = np.array([[
        age, systolic_bp, diastolic_bp, bmi,
        family_history, activity_int, salt_int, stress_int
    ]])

    if model is not None:
        try:
            n_expected = model.n_features_in_
            n_have = base_features.shape[1]
            if n_expected != n_have:
                # Pad or truncate to match what the real model expects
                if n_expected > n_have:
                    pad = np.zeros((1, n_expected - n_have))
                    base_features = np.hstack([base_features, pad])
                else:
                    base_features = base_features[:, :n_expected]
        except AttributeError:
            pass

    return base_features


def _build_malnutrition_features(p: dict, activity_int: int) -> np.ndarray:
    """
    Build 6-feature vector for synthetic malnutrition model:
    [bmi, dietary_diversity, income_level_int, children_under5, age, diet_quality_int]
    """
    bmi = float(p.get("bmi", 23.0))
    dietary_diversity = float(p.get("dietary_diversity", 5.0))
    income_int = {"low": 0, "medium": 1, "high": 2}.get(
        str(p.get("income_level", "medium")).lower(), 1
    )
    children = int(p.get("children_under5", 0))
    age = float(p.get("age", 40))
    diet_int = {"poor": 0, "average": 1, "good": 2}.get(
        str(p.get("diet_quality", "average")).lower(), 1
    )
    return np.array([[bmi, dietary_diversity, income_int, children, age, diet_int]])


# ─────────────────────────────────────────────────────────────────────────────
# Contributing factors logic (unchanged from original)
# ─────────────────────────────────────────────────────────────────────────────
def _get_factors(disease: str, patient_data: dict) -> list:
    factors = []

    if disease == "hypertension":
        if float(patient_data.get("systolic_bp", 120)) >= 130 or \
                float(patient_data.get("diastolic_bp", 80)) >= 85:
            factors.append({"input": "blood_pressure", "points": 40,
                             "reason": "Elevated blood pressure measurements"})
        if float(patient_data.get("bmi", 23)) >= 25:
            factors.append({"input": "bmi", "points": 15,
                             "reason": "Overweight / Obesity"})
        if patient_data.get("salt_intake") == "high":
            factors.append({"input": "salt_intake", "points": 15,
                             "reason": "High dietary salt intake"})
        if patient_data.get("family_history"):
            factors.append({"input": "family_history", "points": 15,
                             "reason": "Family history of cardiovascular issues"})
        if patient_data.get("activity_level") == "low":
            factors.append({"input": "activity_level", "points": 10,
                             "reason": "Sedentary lifestyle"})

    elif disease == "diabetes":
        if float(patient_data.get("bmi", 23)) >= 25:
            factors.append({"input": "bmi", "points": 35,
                             "reason": "Higher body weight indexes"})
        if patient_data.get("family_history"):
            factors.append({"input": "family_history", "points": 25,
                             "reason": "Family history of diabetes"})
        if patient_data.get("activity_level") == "low":
            factors.append({"input": "activity_level", "points": 15,
                             "reason": "Lack of regular exercise"})
        if patient_data.get("diet_quality") == "poor":
            factors.append({"input": "diet_quality", "points": 15,
                             "reason": "Diets rich in simple starches/sugars"})
        if float(patient_data.get("age", 40)) >= 45:
            factors.append({"input": "age", "points": 10,
                             "reason": "Increased risk due to aging"})

    elif disease == "malnutrition":
        if float(patient_data.get("bmi", 23)) < 18.5:
            factors.append({"input": "bmi", "points": 30,
                             "reason": "Underweight classification"})
        if float(patient_data.get("dietary_diversity", 5.0)) < 4.0:
            factors.append({"input": "dietary_diversity", "points": 25,
                             "reason": "Low dietary diversity score"})
        if str(patient_data.get("income_level", "medium")).lower() == "low":
            factors.append({"input": "income_level", "points": 20,
                             "reason": "Economic constraint"})
        if int(patient_data.get("children_under5", 0)) >= 2:
            factors.append({"input": "children_under5", "points": 15,
                             "reason": "Household resource dilution"})

    elif disease == "cvd":
        if float(patient_data.get("systolic_bp", 120)) >= 140:
            factors.append({"input": "blood_pressure", "points": 30,
                             "reason": "Stage-2 high blood pressure"})
        if patient_data.get("smoking"):
            factors.append({"input": "smoking", "points": 30,
                             "reason": "Active smoking habit"})
        if patient_data.get("stress_level") == "high":
            factors.append({"input": "stress_level", "points": 15,
                             "reason": "High emotional or physical stress"})
        if float(patient_data.get("bmi", 23)) >= 28:
            factors.append({"input": "bmi", "points": 15,
                             "reason": "Obesity strain on the heart"})
        if patient_data.get("activity_level") == "low":
            factors.append({"input": "activity_level", "points": 10,
                             "reason": "Lack of cardiorespiratory exercise"})
        # Backward-compat: also check "heart_disease" key (old internal name)
    elif disease == "heart_disease":
        if float(patient_data.get("systolic_bp", 120)) >= 140:
            factors.append({"input": "blood_pressure", "points": 30,
                             "reason": "Stage-2 high blood pressure"})
        if patient_data.get("smoking"):
            factors.append({"input": "smoking", "points": 30,
                             "reason": "Active smoking habit"})
        if patient_data.get("stress_level") == "high":
            factors.append({"input": "stress_level", "points": 15,
                             "reason": "High emotional or physical stress"})
        if float(patient_data.get("bmi", 23)) >= 28:
            factors.append({"input": "bmi", "points": 15,
                             "reason": "Obesity strain on the heart"})
        if patient_data.get("activity_level") == "low":
            factors.append({"input": "activity_level", "points": 10,
                             "reason": "Lack of cardiorespiratory exercise"})

    if not factors:
        factors.append({"input": "none", "points": 0,
                         "reason": "No high-risk lifestyle or biomarker indicators detected"})
    return factors


def _get_recommendation(disease: str, prob: float) -> str:
    if disease == "hypertension":
        if prob >= 70.0:
            return ("Consult a doctor this week. Reduce daily salt, take blood pressure "
                    "readings daily, and walk 30 mins.")
        elif prob >= 35.0:
            return "Monitor blood pressure weekly. Cut down on salty pickles and processed foods."
        return "Maintain a low-sodium diet and check blood pressure during routine screenings."

    elif disease == "diabetes":
        if prob >= 70.0:
            return "Schedule a HbA1c test immediately. Limit rice/bread portions and avoid added sugars."
        elif prob >= 35.0:
            return "Track fasting blood sugar. Replace sweetened tea and soda with water."
        return "Keep a balanced, low-sugar diet and exercise 150 minutes per week."

    elif disease == "malnutrition":
        if prob >= 70.0:
            return ("Urgent nutritional intervention required. Contact community health worker "
                    "for supplementary feeding.")
        elif prob >= 35.0:
            return ("Increase dietary diversity. Incorporate local affordable proteins "
                    "(eggs, lentils) and fortified foods.")
        return "Maintain balanced meals utilizing seasonal local produce to preserve dietary diversity."

    elif disease in ("cvd", "heart_disease"):
        if prob >= 70.0:
            return ("Urgent clinical checkup recommended. Quit smoking immediately, start "
                    "cardiac-friendly activities, and check cholesterol.")
        elif prob >= 35.0:
            return "Focus on stress reduction, avoid high-fat meals, and quit or reduce smoking."
        return "Continue regular aerobic exercise and eat a diet rich in green leafy vegetables."

    return "Follow routine health guidance."


# ─────────────────────────────────────────────────────────────────────────────
# predict_risks() — public API (unchanged interface)
# ─────────────────────────────────────────────────────────────────────────────
def predict_risks(patient_data: dict) -> Dict[str, dict]:
    """
    Predict health risks for a patient.

    Input keys: age, systolic_bp, diastolic_bp, bmi, family_history,
                activity_level (low/medium/high), diet_quality (poor/average/good),
                salt_intake (low/medium/high), stress_level (low/medium/high),
                smoking (bool), dietary_diversity (float 0-10),
                income_level (low/medium/high), children_under5 (int)

    Returns dict:
        {
          "hypertension": { "probability": float, "risk_level": str, "color": str,
                            "contributing_factors": list, "recommendation": str },
          "diabetes":     { ... },
          "cvd":          { ... },
          "malnutrition": { ... }
        }
    Also exposes "heart_disease" as alias for "cvd" for backward compatibility.
    """
    # Ensure models are trained
    if not _models:
        init_models()

    # Shared mapped integers
    activity_int = {"low": 0, "medium": 1, "high": 2}.get(
        str(patient_data.get("activity_level", "medium")).lower(), 1
    )
    smoking_int = 1 if patient_data.get("smoking") else 0

    # Build per-disease feature vectors
    feature_vectors = {
        "diabetes":     _build_diabetes_features(patient_data, activity_int, smoking_int),
        "cvd":          _build_cvd_features(patient_data, activity_int, smoking_int),
        "hypertension": _build_hypertension_features(patient_data, activity_int),
        "malnutrition": _build_malnutrition_features(patient_data, activity_int),
    }

    out: Dict[str, dict] = {}

    for disease, features in feature_vectors.items():
        # Select the right model key
        # CVD was internally called "heart_disease" in old code; now it's "cvd"
        model_key = disease
        if model_key not in _models:
            # Try legacy key
            model_key = "heart_disease" if disease == "cvd" else disease

        if model_key not in _models:
            # Model missing entirely — return neutral score
            out[disease] = {
                "probability": 0.0,
                "risk_level": "low",
                "color": "green",
                "contributing_factors": [],
                "recommendation": "Model unavailable — please retrain.",
            }
            continue

        try:
            model = _models[model_key]
            prob = float(model.predict_proba(features)[0][1] * 100.0)
        except Exception as exc:
            print(f"[ml_models] ⚠️  Prediction failed for {disease}: {exc}")
            prob = 0.0

        # Risk thresholds
        if prob < 35.0:
            level, color = "low", "green"
        elif prob < 70.0:
            level, color = "medium", "yellow"
        else:
            level, color = "high", "red"

        factors = _get_factors(disease, patient_data)
        rec = _get_recommendation(disease, prob)

        # top_factors: top 3 factor reasons as plain strings
        top_factors = [f["reason"] for f in sorted(factors, key=lambda x: -x["points"])[:3]]

        out[disease] = {
            "probability": round(prob, 2),
            "risk_level": level,
            "color": color,
            "top_factors": top_factors,
            "contributing_factors": factors,
            "recommendation": rec,
        }

    # Backward-compat alias: expose "heart_disease" mirroring "cvd"
    if "cvd" in out and "heart_disease" not in out:
        out["heart_disease"] = out["cvd"]

    return out


# ─────────────────────────────────────────────────────────────────────────────
# get_model_info() — public API
# ─────────────────────────────────────────────────────────────────────────────
def get_model_info() -> Dict[str, Any]:
    """
    Return metadata about each trained model.

    Returns:
        {
          "models": {
            "diabetes":     { "source": "real"/"synthetic", "accuracy": float,
                              "n_samples": int, "url": str, "cached": bool },
            "cvd":          { ... },
            "hypertension": { ... },
            "malnutrition": { ... }
          },
          "summary": {
            "total_models": int,
            "real_datasets": int,
            "synthetic_datasets": int
          }
        }
    """
    if not _models:
        init_models()

    real_count = sum(1 for v in _model_info.values() if v.get("source") == "real")
    synthetic_count = len(_model_info) - real_count

    return {
        "models": _model_info,
        "summary": {
            "total_models": len(_model_info),
            "real_datasets": real_count,
            "synthetic_datasets": synthetic_count,
        }
    }


# ─────────────────────────────────────────────────────────────────────────────
# Auto-train on import (backward-compatible)
# ─────────────────────────────────────────────────────────────────────────────
init_models()


# ─────────────────────────────────────────────────────────────────────────────
# ADD TO app.py (copy-paste snippet):
# ─────────────────────────────────────────────────────────────────────────────
#
# from ml_models import predict_risks, get_model_info
#
# @app.get("/model/info")
# async def model_info():
#     return get_model_info()
#
# ─────────────────────────────────────────────────────────────────────────────
