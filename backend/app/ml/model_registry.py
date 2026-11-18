"""ML Model Registry: singleton that loads and holds the trained model."""
from __future__ import annotations
import json
import os
import threading
from typing import Optional

import joblib
import numpy as np

from app.core.config import settings


class ModelRegistry:
    """Thread-safe singleton model registry."""

    _instance: Optional["ModelRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "ModelRegistry":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return
        self._model = None
        self._scaler = None
        self._metadata: dict = {}
        self.model_loaded: bool = False
        self._model_lock = threading.Lock()
        self._initialized = True

    def load_model(self) -> None:
        """Load model, scaler, and metadata from disk. Thread-safe."""
        def _resolve(p):
            if os.path.exists(p):
                return p
            alt = os.path.join("backend", p)
            if os.path.exists(alt):
                return alt
            alt2 = os.path.join("..", p)
            if os.path.exists(alt2):
                return alt2
            return p

        model_path = _resolve(settings.ML_MODEL_PATH)
        scaler_path = _resolve(settings.SCALER_PATH)
        metadata_path = _resolve(settings.METADATA_PATH)

        if not all(os.path.exists(p) for p in [model_path, scaler_path, metadata_path]):
            print(f"[ModelRegistry] Model files not found at {model_path}. model_loaded=False")
            self.model_loaded = False
            return

        with self._model_lock:
            try:
                self._model = joblib.load(model_path)
                self._scaler = joblib.load(scaler_path)
                with open(metadata_path, "r") as f:
                    self._metadata = json.load(f)
                self.model_loaded = True
                print(f"[ModelRegistry] Model loaded: {self._metadata.get('algorithm', 'unknown')} "
                      f"v{self._metadata.get('version', '?')}")
            except Exception as e:
                print(f"[ModelRegistry] Failed to load model: {e}")
                self.model_loaded = False

    @property
    def model(self):
        return self._model

    @property
    def scaler(self):
        return self._scaler

    @property
    def metadata(self) -> dict:
        return self._metadata

    def health(self) -> dict:
        return {
            "model_loaded": self.model_loaded,
            "algorithm": self._metadata.get("algorithm", "none"),
            "version": self._metadata.get("version", "none"),
            "trained_at": self._metadata.get("trained_at", "unknown"),
            "roc_auc": self._metadata.get("roc_auc"),
            "f1_score": self._metadata.get("f1_score"),
        }


model_registry = ModelRegistry()
