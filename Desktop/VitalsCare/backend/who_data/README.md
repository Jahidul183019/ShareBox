# VitalsCare RAG Pipeline Data Sources

This directory contains the reference documents parsed by the 
VitalsCare Retrieval-Augmented Generation (RAG) pipeline to 
provide verified medical context to the AI system.

## Global Standards (World Health Organization)

Clinical guidelines synthesized from official WHO fact sheets 
and publications. Content is clinically accurate and aligned 
with WHO 2023-2024 recommendations.

| Disease | Source | File |
|---|---|---|
| Hypertension | [WHO Fact Sheet](https://www.who.int/news-room/fact-sheets/detail/hypertension) | `who_hypertension_en.txt` / `who_hypertension_bn.txt` |
| Diabetes | [WHO Fact Sheet](https://www.who.int/news-room/fact-sheets/detail/diabetes) | `who_diabetes_en.txt` / `who_diabetes_bn.txt` |
| Malnutrition | [WHO Fact Sheet](https://www.who.int/news-room/fact-sheets/detail/malnutrition) | `who_malnutrition_en.txt` / `who_malnutrition_bn.txt` |
| Heart Disease | [WHO Cardiovascular](https://www.who.int/health-topics/cardiovascular-diseases) | `who_cvd_en.txt` / `who_cvd_bn.txt` |

## Localized Protocols (Bangladesh DGHS)

Adapted from Bangladesh Ministry of Health and Family Welfare 
(MOHFW) and Directorate General of Health Services (DGHS) 
standard treatment protocols.

- **Source**: [DGHS NCDC Guidelines](https://dghs.gov.bd)
- Covers: Hypertension, Diabetes, Malnutrition, CVD
- Context: Rural Bangladesh primary care settings

## Live Scraping

The `/scrape/refresh` API endpoint fetches the latest WHO 
guidelines directly at runtime, keeping recommendations 
current and evidence-based.

## Bengali Support

All guidelines are available in Bengali (বাংলা) for 
accessibility by rural Bangladeshi health workers.

## RAG Pipeline

```
WHO/DGHS Documents
      ↓
Text Chunking (500 words, 100 overlap)
      ↓
TF-IDF Term Matching
      ↓
Top 2 Relevant Chunks Retrieved
      ↓
Passed to Gemini LLM as Context
      ↓
Personalized Bengali/English Advice
```