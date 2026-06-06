import os, requests
key = os.environ.get("GEMINI_API_KEY")
if not key:
    print("No key found locally. Let's make an endpoint on the backend to test it.")
