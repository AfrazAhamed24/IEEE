# UNVERIFIED — USER MUST RUN
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["localhost:5173", "localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", include_in_schema=False)
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/forecast")
def forecast(region: str = "default", days: int = 30) -> list[dict[str, object]]:
    base = 420.0
    trend = 0.6 * (days / 365)
    import math, datetime
    now = datetime.datetime.now()
    results = []
    for i in range(days):
        d = now + datetime.timedelta(days=i)
        co2 = base + trend + 0.3 * math.sin(i * 2 * math.pi / 365)
        results.append({"date": d.strftime("%Y-%m-%d"), "co2_ppm": round(co2, 2)})
    return results