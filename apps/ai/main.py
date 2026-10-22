from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import random

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

KEEPTRACK_API_KEY = "kt_7332c9cf81c237c3174b8ecb54060496"
KEEPTRACK_URL = "https://api.keeptrack.space/v4/sats/brief"

@app.get("/health")
def health():
    return {"status": "ok", "service": "WeatherTrust AI Backend"}

@app.get("/api/satellites")
async def get_real_satellites():
    headers = {"Authorization": f"Bearer {KEEPTRACK_API_KEY}"}
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(KEEPTRACK_URL, headers=headers, timeout=10.0)
            response.raise_for_status()
            data = response.json()
            
            # Filter for weather satellites
            weather_sats = [
                sat for sat in data 
                if sat.get("NAME", "").startswith(("GOES", "NOAA", "METEOR", "FENGYUN"))
            ]
            
            return {
                "satellites": [
                    {
                        "name": sat["NAME"],
                        "noradId": sat["NORAD_ID"],
                        "tle1": sat["TLE_LINE_1"],
                        "tle2": sat["TLE_LINE_2"]
                    } for sat in weather_sats
                ]
            }
        except httpx.HTTPStatusError as e:
            return {"error": f"KeepTrack API error: {e.response.status_code}"}
        except Exception as e:
            return {"error": str(e)}

@app.get("/observations")
def get_observations():
    data = []
    for i in range(500):
        is_flagged = random.random() > 0.8
        ground_truth = 20 + random.random() * 10
        sat_reading = ground_truth + (random.uniform(-5, 5) if is_flagged else random.uniform(-0.5, 0.5))
        
        data.append({
            "obs_id": f"T-{i}",
            "lat": 25 + random.random() * 11,
            "lon": -106 + random.random() * 13,
            "trust_score": random.random() * 0.4 if is_flagged else 0.8 + random.random() * 0.2,
            "flag": is_flagged,
            "top_reasons": "Cloud edge" if is_flagged else "Clear",
            "uncertainty_low": 20,
            "uncertainty_high": 30,
            "sat_value": round(sat_reading, 1),
            "ground_truth": round(ground_truth, 1),
            "delta": round(sat_reading - ground_truth, 1)
        })
    return {"data": data}

@app.get("/metrics")
def get_metrics():
    return {
        "model_precision": 0.94,
        "model_recall": 0.89,
        "total_observations": 500,
        "flagged_fraction": 0.18
    }

@app.get("/proof/{obs_id}")
def get_proof(obs_id: str):
    return {
        "obs_id": obs_id,
        "merkle_root": "0x8f2a9b1c...4e5d",
        "proof": ["0xabc...", "0xdef..."],
        "status": "verified"
    }
