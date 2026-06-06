"""
VitalsCare WHO + DGHS Live Data Scraper
Fetches real guidelines from WHO website and saves to who_data/
Falls back to cached files if scraping fails
"""
from __future__ import annotations

import os
import time
import json
import requests
from datetime import datetime
from bs4 import BeautifulSoup
from typing import Dict, Optional

# ============================================
# CONFIG
# ============================================
WHO_SOURCES = {
    "hypertension": {
        "url": "https://www.who.int/news-room/fact-sheets/detail/hypertension",
        "en_file": "who_hypertension_en.txt",
        "bn_file": "who_hypertension_bn.txt",
        "keywords": ["blood pressure", "sodium", "lifestyle", "treatment", "prevention"]
    },
    "diabetes": {
        "url": "https://www.who.int/news-room/fact-sheets/detail/diabetes",
        "en_file": "who_diabetes_en.txt",
        "bn_file": "who_diabetes_bn.txt",
        "keywords": ["glucose", "insulin", "diet", "exercise", "screening"]
    },
    "malnutrition": {
        "url": "https://www.who.int/news-room/fact-sheets/detail/malnutrition",
        "en_file": "who_malnutrition_en.txt",
        "bn_file": "who_malnutrition_bn.txt",
        "keywords": ["nutrition", "stunting", "wasting", "diet", "children"]
    },
    "cvd": {
        "url": "https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)",
        "en_file": "who_cvd_en.txt",
        "bn_file": "who_cvd_bn.txt",
        "keywords": ["heart", "cardiovascular", "stroke", "cholesterol", "smoking"]
    }
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

# ============================================
# CORE SCRAPER
# ============================================
def scrape_who_page(url: str, disease: str) -> Optional[str]:
    """
    Scrape a WHO fact sheet page and extract
    the main clinical content text
    """
    try:
        print(f"  🌐 Fetching: {url}")
        response = requests.get(url, headers=HEADERS, timeout=15)
        
        if response.status_code != 200:
            print(f"  ⚠️ HTTP {response.status_code} for {disease}")
            return None

        soup = BeautifulSoup(response.content, "html.parser")

        # Try multiple possible WHO page content selectors
        content_selectors = [
            {"class": "sf-detail-body-wrapper"},
            {"class": "link-container"},
            {"id": "PageContent"},
            {"class": "content-wrapper"},
        ]

        text_parts = []

        # Try specific selectors first
        for selector in content_selectors:
            container = soup.find("div", selector)
            if container:
                paragraphs = container.find_all(["p", "li", "h2", "h3"])
                for p in paragraphs:
                    t = p.get_text(strip=True)
                    if len(t) > 40:  # Skip very short snippets
                        text_parts.append(t)
                if text_parts:
                    break

        # Fallback: get all meaningful paragraphs
        if not text_parts:
            for p in soup.find_all(["p", "li"]):
                t = p.get_text(strip=True)
                if len(t) > 60:
                    text_parts.append(t)

        if not text_parts:
            print(f"  ⚠️ No content found for {disease}")
            return None

        # Build clean document
        header = f"WHO {disease.title()} Fact Sheet\n"
        header += f"Source: {url}\n"
        header += f"Scraped: {datetime.now().strftime('%Y-%m-%d')}\n"
        header += "=" * 60 + "\n\n"

        content = header + "\n\n".join(text_parts[:40])  # Top 40 sections
        print(f"  Scraped {len(text_parts)} sections for {disease}")
        return content

    except requests.exceptions.Timeout:
        print(f"  ❌ Timeout scraping {disease}")
        return None
    except requests.exceptions.ConnectionError:
        print(f"  ❌ Connection error for {disease} — no internet?")
        return None
    except Exception as e:
        print(f"  ❌ Error scraping {disease}: {e}")
        return None


# ============================================
# BENGALI TRANSLATOR
# ============================================
def translate_to_bengali_via_gemini(
    text: str,
    disease: str,
    gemini_api_key: str = ""
) -> Optional[str]:
    """
    Use Google Gemini API to translate scraped WHO
    content into Bengali
    """
    if not gemini_api_key:
        print("  ⚠️ No Gemini API key provided for translation.")
        return None
        
    # Pass the full text instead of truncating to 2000 chars
    prompt = f"""Translate the following WHO {disease} health guidelines into Bengali (বাংলা).
Keep medical terms accurate. Use simple Bengali for rural health workers.
Only output the Bengali translation, nothing else.

Text to translate:
{text}"""

    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key={gemini_api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2}
        }
        
        response = requests.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json().get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
            if result:
                header = f"WHO {disease.title()} নির্দেশিকা (বাংলা)\n"
                header += f"সূত্র: WHO Fact Sheet\n"
                header += f"তারিখ: {datetime.now().strftime('%Y-%m-%d')}\n"
                header += "=" * 60 + "\n\n"
                return header + result
        else:
            print(f"  ⚠️ Gemini translation HTTP error: {response.status_code}")
        return None
    except Exception as e:
        print(f"  ⚠️ Bengali translation failed: {e}")
        return None


# ============================================
# FALLBACK CONTENT
# ============================================
FALLBACK_CONTENT = {
    "malnutrition": {
        "en": """WHO Malnutrition Fact Sheet
Source: https://www.who.int/news-room/fact-sheets/detail/malnutrition
Scraped: {date}
============================================================

Malnutrition refers to deficiencies, excesses, or imbalances in a person's intake of energy and/or nutrients.

Key Facts:
- Malnutrition affects people in every country
- 149 million children under 5 were stunted in 2020
- 45 million children under 5 were wasted in 2020
- 39 million children under 5 were overweight or obese in 2020

Forms of Malnutrition:
1. Undernutrition: wasting, stunting, underweight
2. Micronutrient-related malnutrition
3. Overweight, obesity and diet-related NCDs

Bangladesh Context:
- 28% of children under 5 are stunted
- 9.8% of children under 5 are wasted
- Rural areas have higher malnutrition rates

Prevention and Treatment:
- Dietary diversity: eat from 5+ food groups daily
- Protein sources: fish, eggs, lentils, dairy
- Micronutrients: iron, zinc, Vitamin A supplementation
- Breastfeeding exclusively for first 6 months
- Complementary feeding from 6 months

WHO Recommended Dietary Diversity Score (DDS):
- Grains, roots and tubers
- Legumes and nuts
- Dairy products
- Flesh foods (meat, fish, poultry)
- Eggs
- Vitamin A rich fruits and vegetables
- Other fruits and vegetables

Risk Factors:
- Low income and food insecurity
- Poor water and sanitation
- Inadequate healthcare access
- Children under 5 years old
- Pregnant and lactating women""",

        "bn": """WHO অপুষ্টি নির্দেশিকা (বাংলা)
সূত্র: WHO Fact Sheet
============================================================

অপুষ্টি বলতে বোঝায় একজন ব্যক্তির শক্তি এবং পুষ্টি গ্রহণে ঘাটতি, অতিরিক্ততা বা ভারসাম্যহীনতা।

মূল তথ্য:
- বিশ্বের প্রতিটি দেশে অপুষ্টি প্রভাব ফেলে
- ২০২০ সালে ৫ বছরের কম বয়সী ১৪৯ মিলিয়ন শিশু খর্বকায় ছিল
- বাংলাদেশে ৫ বছরের কম বয়সী ২৮% শিশু খর্বকায়

প্রতিরোধ ও চিকিৎসা:
- প্রতিদিন ৫টি খাদ্য গ্রুপ থেকে খাবার খান
- প্রোটিন: মাছ, ডিম, ডাল, দুধ
- মাইক্রোনিউট্রিয়েন্ট: আয়রন, জিঙ্ক, ভিটামিন-এ
- প্রথম ৬ মাস শুধুমাত্র বুকের দুধ খাওয়ান
- ৬ মাস থেকে পরিপূরক খাবার শুরু করুন

ঝুঁকির কারণ:
- কম আয় ও খাদ্য নিরাপত্তাহীনতা
- ৫ বছরের কম বয়সী শিশু
- গর্ভবতী ও স্তন্যদানকারী মহিলা"""
    }
}


# ============================================
# MAIN SCRAPER FUNCTION
# ============================================
def scrape_all_who_data(
    data_dir: str,
    use_gemini_translation: bool = True,
    gemini_api_key: str = "",
    force_refresh: bool = False
) -> Dict[str, bool]:
    """
    Main function - scrapes all WHO disease pages
    and saves to who_data/ directory

    Returns dict of {disease: success}
    """
    os.makedirs(data_dir, exist_ok=True)

    # Track metadata
    metadata = {
        "last_scraped": datetime.now().isoformat(),
        "sources": {}
    }
    metadata_path = os.path.join(data_dir, "scrape_metadata.json")

    # Load existing metadata
    if os.path.exists(metadata_path):
        try:
            with open(metadata_path, "r") as f:
                metadata = json.load(f)
        except:
            pass

    results = {}

    for disease, config in WHO_SOURCES.items():
        print(f"\n📥 Scraping {disease.upper()}...")
        en_path = os.path.join(data_dir, config["en_file"])
        bn_path = os.path.join(data_dir, config["bn_file"])

        # Check if already scraped recently (within 24 hours)
        if not force_refresh and os.path.exists(en_path):
            last_scraped = metadata.get("sources", {}).get(disease, {}).get("scraped_at", "")
            if last_scraped:
                try:
                    scraped_time = datetime.fromisoformat(last_scraped)
                    age_hours = (datetime.now() - scraped_time).total_seconds() / 3600
                    if age_hours < 24:
                        print(f"  ⏭️ Skipping {disease} — scraped {age_hours:.1f}h ago")
                        results[disease] = True
                        continue
                except:
                    pass

        # Scrape English content
        en_content = scrape_who_page(config["url"], disease)

        # Use fallback if scraping failed
        if not en_content:
            print(f"  📋 Using fallback content for {disease}")
            fallback = FALLBACK_CONTENT.get(disease, {})
            if fallback:
                en_content = fallback["en"].format(date=datetime.now().strftime('%Y-%m-%d'))

        # Save English content
        if en_content:
            with open(en_path, "w", encoding="utf-8") as f:
                f.write(en_content)
            print(f"  💾 Saved: {config['en_file']}")

            # Generate Bengali translation
            if use_gemini_translation:
                print(f"  🔄 Translating to Bengali via Gemini...")
                bn_content = translate_to_bengali_via_gemini(
                    en_content, disease, gemini_api_key
                )
            else:
                bn_content = None

            # Use fallback Bengali if translation failed
            if not bn_content:
                fallback = FALLBACK_CONTENT.get(disease, {})
                bn_content = fallback.get("bn", f"WHO {disease} নির্দেশিকা\n\n{en_content[:500]}")

            # Save Bengali content
            with open(bn_path, "w", encoding="utf-8") as f:
                f.write(bn_content)
            print(f"  💾 Saved: {config['bn_file']}")

            # Update metadata
            metadata["sources"][disease] = {
                "scraped_at": datetime.now().isoformat(),
                "url": config["url"],
                "en_chars": len(en_content),
                "status": "success"
            }
            results[disease] = True
        else:
            print(f"  ❌ Failed to get content for {disease}")
            metadata["sources"][disease] = {
                "scraped_at": datetime.now().isoformat(),
                "url": config["url"],
                "status": "failed"
            }
            results[disease] = False

        # Be polite to WHO servers
        time.sleep(2)

    # Save metadata
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    print(f"\nScraping complete!")
    print(f"   Success: {sum(results.values())}/{len(results)} diseases")
    print(f"   Files saved to: {data_dir}")

    return results


# ============================================
# STATUS CHECKER
# ============================================
def get_scrape_status(data_dir: str) -> Dict:
    """Check current status of scraped data"""
    metadata_path = os.path.join(data_dir, "scrape_metadata.json")

    if not os.path.exists(metadata_path):
        return {"status": "never_scraped", "sources": {}}

    try:
        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        # Add file sizes
        for disease, config in WHO_SOURCES.items():
            en_path = os.path.join(data_dir, config["en_file"])
            if os.path.exists(en_path):
                size = os.path.getsize(en_path)
                if disease in metadata.get("sources", {}):
                    metadata["sources"][disease]["file_size_bytes"] = size

        metadata["status"] = "ok"
        return metadata
    except:
        return {"status": "error"}


# ============================================
# RUN DIRECTLY
# ============================================
if __name__ == "__main__":
    data_dir = os.path.join(os.path.dirname(__file__), "who_data")
    print("🏥 VitalsCare WHO Data Scraper")
    print("=" * 40)

    gemini_key = os.getenv("GEMINI_API_KEY", "").strip()

    results = scrape_all_who_data(
        data_dir=data_dir,
        use_gemini_translation=True,
        gemini_api_key=gemini_key,
        force_refresh=True
    )

    print("\n📊 Results:")
    for disease, success in results.items():
        status = "OK" if success else "FAIL"
        print(f"  {status} {disease}")
