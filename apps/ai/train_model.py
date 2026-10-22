import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
import joblib
import json
import os

# 1. Generate realistic synthetic climate data
np.random.seed(42)
n_samples = 5000

# Normal data: Ground truth ~ 25C, Satellite reading ~ 25C (small error), Cloud cover low
lat = np.random.uniform(25, 36, n_samples)
lon = np.random.uniform(-106, -93, n_samples)
ground_truth = np.random.uniform(20, 30, n_samples)
cloud_fraction = np.random.uniform(0, 0.3, n_samples) # mostly clear
view_angle = np.random.uniform(0, 45, n_samples)

# Satellite has a small error (~0.5C) plus a slight bias from view angle
sat_reading = ground_truth + np.random.normal(0, 0.5, n_samples) + (view_angle * 0.01)

# Inject anomalies (10% of data): High cloud cover causes massive errors
anomaly_idx = np.random.choice(n_samples, int(n_samples * 0.1), replace=False)
sat_reading[anomaly_idx] += np.random.uniform(4, 10, len(anomaly_idx))
cloud_fraction[anomaly_idx] = np.random.uniform(0.6, 1.0, len(anomaly_idx))

df = pd.DataFrame({
    'lat': lat, 'lon': lon,
    'ground_truth': ground_truth,
    'sat_reading': sat_reading,
    'cloud_fraction': cloud_fraction,
    'view_angle': view_angle,
    'is_anomaly': 0
})
df.loc[anomaly_idx, 'is_anomaly'] = 1

# 2. Feature Engineering
df['delta'] = df['sat_reading'] - df['ground_truth']
X = df[['delta', 'cloud_fraction', 'view_angle']]

# 3. Train Isolation Forest
model = IsolationForest(contamination=0.1, random_state=42)
model.fit(X)

# 4. Evaluate
preds = model.predict(X)
df['predicted_anomaly'] = np.where(preds == -1, 1, 0)

report = classification_report(df['is_anomaly'], df['predicted_anomaly'], output_dict=True)

# 5. Save Model and Metrics
joblib.dump(model, 'anomaly_model.joblib')
with open('model_metrics.json', 'w') as f:
    json.dump(report, f, indent=4)

print("✅ ML Model Trained Successfully")
print(f"Precision: {report['1']['precision']:.3f}, Recall: {report['1']['recall']:.3f}")
print("Saved to anomaly_model.joblib and model_metrics.json")
