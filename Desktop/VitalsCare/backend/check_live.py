import requests
print("Hitting live Render backend to get model list...")
response = requests.get("https://health-risk-radar.onrender.com/health")
print(response.json())
