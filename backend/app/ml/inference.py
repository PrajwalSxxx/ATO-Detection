"""ML Inference: run model predictions and calibrate anomaly scores."""
from __future__ import annotations
import numpy as np
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.ml.model_registry import ModelRegistry


def predict(feature_vector: np.ndarray, registry: "ModelRegistry") -> dict:
    """
    Run ML inference on a feature vector.

    Returns:
        {
          anomaly_score: float 0-1 (calibrated using sigmoid of decision function),
          raw_score: float (raw decision function output),
          is_anomaly: bool
        }
    """
    if not registry.model_loaded:
        return {"anomaly_score": 0.0, "raw_score": 0.0, "is_anomaly": False}

    try:
        scaled = registry.scaler.transform(feature_vector)
        model = registry.model

        # For IsolationForest: decision_function returns negative = anomaly
        if hasattr(model, "decision_function"):
            raw = float(model.decision_function(scaled)[0])
            # Convert to 0-1 anomaly score (more negative = higher risk)
            # Typical range: [-0.5, 0.5]; invert and normalize via sigmoid
            anomaly_score = float(1.0 / (1.0 + np.exp(raw * 10)))
            is_anomaly = model.predict(scaled)[0] == -1
        elif hasattr(model, "predict_proba"):
            proba = model.predict_proba(scaled)[0]
            anomaly_score = float(proba[1]) if len(proba) > 1 else float(proba[0])
            raw = anomaly_score
            is_anomaly = anomaly_score > 0.5
        else:
            pred = model.predict(scaled)[0]
            is_anomaly = bool(pred == -1 or pred == 1)
            anomaly_score = 1.0 if is_anomaly else 0.0
            raw = anomaly_score

        return {
            "anomaly_score": min(1.0, max(0.0, anomaly_score)),
            "raw_score": raw,
            "is_anomaly": is_anomaly,
        }
    except Exception as e:
        print(f"[inference] Prediction failed: {e}")
        return {"anomaly_score": 0.0, "raw_score": 0.0, "is_anomaly": False}
