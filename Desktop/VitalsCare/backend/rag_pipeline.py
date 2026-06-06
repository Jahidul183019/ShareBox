"""RAG pipeline retrieving clinical guidelines from WHO/DGHS PDFs and text files.

This system scans the `who_data` directory for PDFs, text files, and markdown documents,
extracts text, chunks it, and performs a TF-IDF term overlap query matching. It falls
back to localized default files if no reference guides are placed in `who_data`.
"""
from __future__ import annotations

import os
import re
import math
from typing import Dict, List, Any
from scraper import scrape_who_page, WHO_SOURCES

try:
    import pypdf
except ImportError:
    pypdf = None


def _split_text(text: str, source_name: str, chunk_size: int = 500, overlap: int = 100) -> List[Dict[str, str]]:
    """Splits a body of text into overlapping document chunks."""
    words = text.split()
    chunks = []
    
    step = chunk_size - overlap
    if step <= 0:
        step = chunk_size
        
    for i in range(0, len(words), step):
        chunk_words = words[i:i + chunk_size]
        chunk_text = " ".join(chunk_words).strip()
        if chunk_text:
            chunks.append({
                "text": chunk_text,
                "source": source_name
            })
            
    return chunks


def _load_guidelines(lang: str = "en") -> List[Dict[str, str]]:
    """Reads and parses PDFs and text files from the who_data folder."""
    chunks = []
    data_dir = os.path.join(os.path.dirname(__file__), "who_data")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)

    for filename in os.listdir(data_dir):
        filepath = os.path.join(data_dir, filename)
        
        # Filter default files by language suffix if possible to prevent overlap
        if "_en.txt" in filename and lang == "bn":
            continue
        if "_bn.txt" in filename and lang == "en":
            continue

        if filename.endswith(".pdf"):
            if pypdf is None:
                print("pypdf is not installed, skipping PDF reading")
                continue
            try:
                reader = pypdf.PdfReader(filepath)
                text = ""
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                chunks.extend(_split_text(text, filename))
            except Exception as e:
                print(f"Error reading PDF {filename}: {e}")
        elif filename.endswith(".txt") or filename.endswith(".md"):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    text = f.read()
                chunks.extend(_split_text(text, filename))
            except Exception as e:
                print(f"Error reading text {filename}: {e}")
                
    return chunks


def _retrieve_top_chunks(query: str, chunks: List[Dict[str, str]], top_k: int = 2) -> List[str]:
    """Simple term-matching algorithm to score and rank document chunks."""
    if not chunks:
        return []
    
    def tokenize(text: str) -> List[str]:
        return re.findall(r'[a-zA-Z0-9\u0980-\u09ff]+', text.lower())

    query_tokens = tokenize(query)
    scores = []
    
    for chunk in chunks:
        text = chunk["text"]
        tokens = tokenize(text)
        score = 0.0
        for token in query_tokens:
            tf = tokens.count(token)
            if tf > 0:
                score += (1.0 + math.log(tf))
        
        if len(tokens) > 0:
            score /= math.sqrt(len(tokens))
            
        scores.append((score, text))
        
    scores.sort(key=lambda x: x[0], reverse=True)
    
    # Return top_k matching blocks
    results = [text for score, text in scores if score > 0]
    return results[:top_k]


def get_who_recommendations(disease: str, risk_level: str, patient: dict, lang: str = "en") -> Dict[str, Any]:
    """Retrieve matches from the WHO guideline library based on disease context."""
    
    chunks = _load_guidelines(lang)
    source_label = "who_data_rag"
    
    # Construct a structured query matching the patient's state
    query = f"{disease} guidelines advice recommendations {risk_level} {patient.get('activity_level', '')} {patient.get('diet_quality', '')}"
    if lang == "bn":
        disease_map = {
            "hypertension": "উচ্চ রক্তচাপ হাইপারটেনশন",
            "diabetes": "ডায়াবেটিস রক্তে শর্করা গ্লুকোজ",
            "malnutrition": "অপুষ্টি পুষ্টিহীনতা খাদ্য",
            "heart_disease": "হৃদরোগ কার্ডিওভাসকুলার স্ট্রোক"
        }
        query = f"{disease_map.get(disease.lower(), disease)} নির্দেশিকা পরামর্শ ঝুঁকি {risk_level}"

    matches = _retrieve_top_chunks(query, chunks, top_k=2)
    
    # Fallback to static lists if index returned no relevant text chunks
    if not matches:
        if lang == "bn":
            matches = [
                f"{disease} ঝুঁকির জন্য ডাব্লুএইচও নির্দেশিকা অনুসরণ করুন। লবণ গ্রহণ সীমিত রাখুন এবং শারীরিক পরিশ্রম বাড়ান।"
            ]
        else:
            matches = [
                f"Follow WHO standard protocol for {disease}. Modify lifestyle risk factors and consult a physician."
            ]

    return {
        "guidelines": matches,
        "source": source_label
    }
