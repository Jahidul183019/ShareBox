import os, requests
key = os.environ.get("GEMINI_API_KEY")
if key:
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
    resp = requests.get(url)
    print("STATUS:", resp.status_code)
    try:
        models = resp.json().get("models", [])
        for m in models:
            if "flash" in m["name"]:
                print(m["name"])
    except:
        print(resp.text)
else:
    print("NO KEY")
