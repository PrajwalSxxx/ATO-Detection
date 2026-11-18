# Risk Scoring Methodology

> [!NOTE]
> This document details the transparent weighted scoring engine implemented in `backend/app/services/risk_service.py`. All factor weights, interaction terms, and decision thresholds are documented below.

---

## Overview

Every login attempt is evaluated through a hybrid scoring pipeline that combines:
1. **Rule-Based Heuristic Signals** (device history, IP subnet, geo-velocity, failure bursts, browser/OS changes)
2. **Machine Learning Anomaly Signal** (Isolation Forest inference score)
3. **Contextual Adjustments** (Trust reductions for known environments, interaction bonuses for correlated attack indicators)

The resulting score is normalized into **[0, 100]**:
- **0–29**: Low risk → **Allow** (issue access token)
- **30–49**: Medium risk → **MFA Challenge** (trigger OTP verification)
- **50–69**: High risk → **MFA Challenge** / Step-up auth
- **70–100**: Critical risk → **Block** (reject login and generate security alert)

---

## Weight Matrix & Heuristic Factors

The default weight configuration (`_DEFAULT_WEIGHTS` in `risk_service.py`) assigns points up to a maximum cap:

| Signal / Factor | Max Points | Condition & Calculation | Description |
|-----------------|------------|-------------------------|-------------|
| **ML Anomaly Signal** | 30 pts | `anomaly_score * 30` | Isolation Forest anomaly score scaled between 0 and 1 |
| **New Device** | 15 pts | `is_new_device == 1` | Unrecognized browser/device fingerprint |
| **New IP Subnet** | 10 pts | `is_new_ip_subnet == 1` | IP /24 subnet has never been seen for this user |
| **Failed Attempts** | 15 pts | `min(failures_15m * 5, 10) + min(failures_1h * 2, 5)` | Rapid-fire credential guessing or brute force |
| **Impossible Travel** | 15 pts | `impossible_travel_flag == 1` | Velocity between logins > 800 km/h |
| **Location Change** | 12 pts | `country_changed == 1` *(or 6 pts if distance > 500 km)* | Geolocation shift from previous login baseline |
| **Unusual Hour** | 8 pts | `is_unusual_hour == 1` | Login outside user's typical daytime hours (06:00–22:00) |
| **Browser / OS Change**| 5 pts | `browser_changed` or `os_changed` | User-agent family mismatch against known history |
| **Baseline Deviation** | 2 pts | `deviation_from_baseline * 2` (if > 0.5) | Deviation from historical temporal habits |

---

## Contextual Adjustments

### 1. Trust Reduction (-5 Points)
If the login originates from a **known device**, a **known IP subnet**, and occurs during **normal hours**:
```python
if not is_new_device and not is_new_ip_subnet and not is_unusual_hour:
    score = max(0.0, score - 5.0)
```
This prevents false positives for routine logins by legitimate users.

### 2. Interaction Bonus (+5 Points)
When a login simultaneously exhibits a **new device** AND a **country change**, an interaction bonus is added:
```python
if is_new_device and country_changed:
    score += 5.0
```
Correlated anomalies indicate a significantly higher probability of credential stuffing from proxy networks.

---

## ML Signal Integration

The Isolation Forest computes an anomaly decision function:
```python
# app/ml/inference.py
raw_score = model.decision_function(features)[0]
# Normalizes decision function into [0, 1] anomaly score:
anomaly_score = clamp((-raw_score + 0.15) / 0.35, 0.0, 1.0)
```
- A completely normal login produces an anomaly score near `0.0`.
- An anomalous outlier produces an anomaly score near `1.0`.
- The ML contribution directly adds `anomaly_score * 30.0` points to the composite score.
- If the model is not loaded (or disabled in configuration), `ml_contributed` is flagged `False` and rule heuristics operate independently.

---

## Worked Example

### Scenario: Suspicious International Login
A user whose baseline is in New York logs in from a newly seen device in Germany, 6,500 km away, 30 minutes after their last domestic login. One previous password attempt failed 5 minutes ago.

| Factor | Evaluation | Points Awarded |
|--------|------------|----------------|
| ML Anomaly Signal | Anomaly score = 0.88 | `0.88 * 30` = **26.4 pts** |
| New Device | Fingerprint unrecognized | **15.0 pts** |
| New IP Subnet | German ISP subnet unrecognized | **10.0 pts** |
| Failed Attempts | 1 failure in 15m (`min(1*5, 10)`) | **5.0 pts** |
| Impossible Travel | 6,500 km in 30 min (> 13,000 km/h) | **15.0 pts** |
| Browser/OS Change | Switched from macOS Safari to Windows Chrome | **5.0 pts** |
| Interaction Bonus | New device + new country | **5.0 pts** |
| Trust Reduction | Not eligible (new device & subnet) | **0.0 pts** |
| **Total Composite Score** | `min(26.4 + 15 + 10 + 5 + 15 + 5 + 5, 100)` | **81.4 / 100** |

**Decision**:
- **Score**: 81.4
- **Risk Level**: `critical` (Score ≥ 70)
- **Action**: `block` — Login blocked, temporary session token rejected, security alert raised for analyst review.

---

## Decision Matrix Summary

| Score Range | Level | Action Taken | User Experience |
|-------------|-------|--------------|-----------------|
| **0 – 29** | `low` | `allow` | Direct access; JWT access token returned. |
| **30 – 49** | `medium` | `mfa` | MFA prompt; temporary session token issued awaiting OTP verification. |
| **50 – 69** | `high` | `mfa` | High-risk MFA prompt; warning email dispatched. |
| **70 – 100** | `critical` | `block` | Request rejected with 403 Forbidden; audit event logged; security alert queued. |

---

## Honest Limitations

> [!WARNING]
> - **Heuristic Weights**: Weights were established from security best practices, not tuned via regression on labeled enterprise attack corpora.
> - **Synthetic Calibration**: The 30-point ML contribution is calibrated against the synthetic training dataset.
> - **Threshold Rigidity**: Fixed thresholds (30/70) apply uniformly across all accounts rather than adapting to tenant-level risk tolerances.
