"""Tests for ML feature pipeline, model training, registry, and inference."""
import os
import numpy as np
import pytest
from app.ml.feature_pipeline import FEATURE_NAMES, feature_vector_to_array, dict_to_array
from app.ml.model_registry import model_registry
from app.ml.inference import predict
from app.services.feature_service import FeatureVector


def test_feature_pipeline_array_shape():
    fv = FeatureVector(
        failed_attempts_15min=0,
        failed_attempts_1h=0,
        is_new_device=0,
        is_new_ip=0,
        is_new_ip_subnet=0,
        login_hour_sin=0.0,
        login_hour_cos=1.0,
        is_unusual_hour=0,
        logins_last_hour=1,
        logins_last_24h=2,
        seconds_since_last_login_log=5.0,
        geo_distance_km=0.0,
        country_changed=0,
        impossible_travel_flag=0,
        browser_changed=0,
        os_changed=0,
        ua_rarity_score=0.1,
        deviation_from_baseline=0.0,
    )
    arr = feature_vector_to_array(fv)
    assert arr.shape == (1, 18)
    assert len(FEATURE_NAMES) == 18


def test_dict_to_array():
    sample_dict = {name: 1.0 for name in FEATURE_NAMES}
    arr = dict_to_array(sample_dict)
    assert arr.shape == (1, 18)
    assert np.all(arr == 1.0)


def test_model_registry_health_structure():
    health = model_registry.health()
    assert "model_loaded" in health
    assert "algorithm" in health
    assert "version" in health


def test_inference_unloaded_model():
    """When model is not loaded, predict gracefully returns safe defaults."""
    # Temporarily force unloaded
    original_state = model_registry.model_loaded
    model_registry.model_loaded = False
    dummy_input = np.zeros((1, 18))
    result = predict(dummy_input, model_registry)

    assert result["anomaly_score"] == 0.0
    assert result["is_anomaly"] is False

    # Restore state
    model_registry.model_loaded = original_state
