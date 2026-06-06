# VitalsCare — Datasets

This folder contains the real Kaggle datasets used to train the XGBoost models
in `ml_models.py`, plus cached trained models in `trained_models/`.

---

## CSV Files

| File | Disease | Source | Records | License |
|---|---|---|---|---|
| `diabetes_prediction_dataset.csv` | Diabetes | [Kaggle — iammustafatz](https://www.kaggle.com/datasets/iammustafatz/diabetes-prediction-dataset) | 100,000 | CC BY 4.0 |
| `heart.csv` | CVD / Heart Disease | [Kaggle — fedesoriano](https://www.kaggle.com/datasets/fedesoriano/heart-failure-prediction) | 918 | Open |
| `hypertension_dataset.csv` | Hypertension | [Kaggle — miadul](https://www.kaggle.com/datasets/miadul/hypertension-risk-prediction-dataset) | 1,186 | Open |
| `cardio_train.csv` | Malnutrition (proxy) | [Kaggle — sulianova](https://www.kaggle.com/datasets/sulianova/cardiovascular-disease-dataset) | 70,000 | Open |

---

## Column Mappings

### `diabetes_prediction_dataset.csv`
```
gender, age, hypertension, heart_disease, smoking_history, bmi, HbA1c_level, blood_glucose_level → diabetes
```
- `smoking_history`: current/ever/former → 1 (smoker), else → 0
- `activity_level_int`: derived from blood_glucose_level (>200=0, >140=1, else=2)

### `heart.csv`
```
Age, Sex, ChestPainType, RestingBP, Cholesterol, FastingBS, RestingECG,
MaxHR, ExerciseAngina, Oldpeak, ST_Slope → HeartDisease
```
- `activity_level_int`: derived from MaxHR (>150=2, >100=1, else=0)
- `ExerciseAngina`: Y→1, N→0

### `hypertension_dataset.csv`
```
Age, Salt_Intake, Stress_Score, BP_History, Sleep_Duration, BMI,
Medication, Family_History, Exercise_Level, Smoking_Status → Has_Hypertension
```
- `Has_Hypertension`: Yes→1, No→0
- `BP_History`: normal→0, elevated→1, high→2
- `Exercise_Level`: low→0, moderate→1, high→2

### `cardio_train.csv` (used for Malnutrition proxy)
```
id; age (days); gender; height (cm); weight (kg); ap_hi; ap_lo;
cholesterol; gluc; smoke; alco; active; cardio
```
**Derived malnutrition features:**
- `bmi` = weight / (height/100)²
- `dietary_diversity` = derived from cholesterol + gluc + active score (0–10)
- `income_level_int` = proxy from active + (1−alco) + (1−smoke) → 0/1/2
- `children_proxy` = age-based estimate of children under 5
- `age_years` = age / 365.25
- `diet_quality_int` = derived from gluc level (normal=2, above=1, well_above=0)

**Malnutrition label:** `bmi < 18.5` OR `dietary_diversity < 4` OR `(income==0 AND children > 2)`

---

## `trained_models/`

Cached `.joblib` files for each trained XGBoost model.
Automatically regenerated on first run if deleted.

| File | Disease | Data Source |
|---|---|---|
| `diabetes.joblib` | Diabetes | Real — 100,000 samples |
| `cvd.joblib` | CVD / Heart Disease | Real — 918 samples |
| `hypertension.joblib` | Hypertension | Real — 1,186 samples |
| `malnutrition.joblib` | Malnutrition | Real proxy — 70,000 samples |

---

## To retrain models from scratch
```bash
# Delete cached models
rm trained_models/*.joblib

# Restart the backend — models retrain automatically on import
cd .. && python3 -c "import ml_models"
```

---

> **Note:** These datasets are for research and demonstration purposes only.
> VitalsCare is designed for community health screening in rural Bangladesh.
> Always consult a qualified healthcare professional for medical advice.
