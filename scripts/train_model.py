"""Train ML model for anomaly detection using Isolation Forest."""
import json
import os
import time
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

FEATURE_NAMES = [
    "failed_attempts_15min",
    "failed_attempts_1h",
    "is_new_device",
    "is_new_ip",
    "is_new_ip_subnet",
    "login_hour_sin",
    "login_hour_cos",
    "is_unusual_hour",
    "logins_last_hour",
    "logins_last_24h",
    "seconds_since_last_login_log",
    "geo_distance_km",
    "country_changed",
    "impossible_travel_flag",
    "browser_changed",
    "os_changed",
    "ua_rarity_score",
    "deviation_from_baseline",
]


from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def train_and_save(
    data_path: str = None,
    model_dir: str = None,
    contamination: float = 0.07,
) -> dict:
    """
    Train an Isolation Forest on the feature dataset, evaluate metrics, and persist artifacts.
    Also syncs artifacts to backend/models.
    """
    if data_path is None:
        data_path = str(ROOT_DIR / "ml-data" / "sample_login_data.csv")
    if model_dir is None:
        model_dir = str(ROOT_DIR / "backend" / "models")

    if not os.path.exists(data_path):
        from scripts.generate_sample_data import generate_dataset
        generate_dataset(data_path)

    target_dirs = [model_dir]

    # Load dataset
    print(f"[train_model] Loading data from {data_path}...")
    df = pd.read_csv(data_path)

    X = df[FEATURE_NAMES].values
    y = df["is_ato"].values if "is_ato" in df.columns else np.zeros(len(df))

    # Split train/test (80/20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # Fit StandardScaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Isolation Forest
    # Contamination is expected fraction of outliers (~7%)
    print("[train_model] Training IsolationForest (n_estimators=150)...")
    start_t = time.time()
    model = IsolationForest(
        n_estimators=150,
        max_samples="auto",
        contamination=contamination,
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train_scaled)
    train_duration = time.time() - start_t

    # Evaluate on test set
    # IsolationForest: -1 = anomaly, 1 = normal
    raw_preds = model.predict(X_test_scaled)
    y_pred_binary = (raw_preds == -1).astype(int)

    # Anomaly scores: decision function is negative for anomalies
    # Sigmoid inversion: 1 / (1 + exp(raw * 10))
    raw_scores = model.decision_function(X_test_scaled)
    anomaly_scores = 1.0 / (1.0 + np.exp(raw_scores * 10))

    roc_auc = float(roc_auc_score(y_test, anomaly_scores))
    f1 = float(f1_score(y_test, y_pred_binary, zero_division=0))
    precision = float(precision_score(y_test, y_pred_binary, zero_division=0))
    recall = float(recall_score(y_test, y_pred_binary, zero_division=0))

    print(f"[train_model] Evaluation metrics:")
    print(f"  ROC-AUC:   {roc_auc:.4f}")
    print(f"  F1 Score:  {f1:.4f}")
    print(f"  Precision: {precision:.4f}")
    print(f"  Recall:    {recall:.4f}")
    print(f"  Train time:{train_duration:.2f}s")

    metadata = {
        "algorithm": "IsolationForest",
        "version": "1.0.0",
        "features": FEATURE_NAMES,
        "n_features": len(FEATURE_NAMES),
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "contamination": contamination,
        "roc_auc": round(roc_auc, 4),
        "f1_score": round(f1, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "train_duration_seconds": round(train_duration, 2),
        "trained_at": datetime.now(timezone.utc).isoformat(),
    }

    # Save to all target locations
    for d in set(target_dirs):
        os.makedirs(d, exist_ok=True)
        joblib.dump(model, os.path.join(d, "model.joblib"))
        joblib.dump(scaler, os.path.join(d, "scaler.joblib"))
        with open(os.path.join(d, "model_metadata.json"), "w") as f:
            json.dump(metadata, f, indent=2)
        print(f"[train_model] Saved artifacts to {d}/")

    return metadata


if __name__ == "__main__":
    train_and_save()
