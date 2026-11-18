# ml-data — Synthetic Training Data

> **⚠️ SYNTHETIC DATA ONLY**
> This directory contains **entirely computer-generated, synthetic data**. It does **not** contain real user login records, real attack traffic, or real IP addresses. No personal information is present. Probabilities and anomaly scores produced by a model trained on this data are **not calibrated** against real-world attack rates.

---

## Directory Contents

| File | Description |
|------|-------------|
| `sample_login_data.csv` | Synthetic login event dataset (10,000 rows) with 18 behavioral features used to train the Isolation Forest anomaly detector |

---

## How the Data Is Generated

The script `scripts/generate_sample_data.py` creates this dataset:

1. **Normal logins (93% of records, ~9,300 rows)** — Sampled from typical user distributions:
   - Login hour: Peak between 8 AM and 9 PM local time
   - Device & IP: Predominantly known devices (92%) and familiar IP subnets (93%)
   - Failed attempts: Zero or single failure in prior 15m/1h (<5%)
   - Geo distance: Exponential distribution centered around home/work (mean ~15 km)
   - Impossible travel flag: Always 0; country changes < 2%
   - Browser & OS: Low rarity and low baseline deviation

2. **Anomalous logins (7% of records, ~700 rows)** — Simulated attack patterns:
   - **Credential Stuffing / Brute Force**: Burst of failed attempts (3-12 in 15m), high volume in 1h, new device/IP.
   - **Impossible Travel**: Extreme geo-distance (2,000–12,000 km) within short login time gap, country changed, `impossible_travel_flag=1`.
   - **Suspicious New Device / Location**: Unfamiliar device fingerprint, foreign country, rare user-agent string (`ua_rarity_score > 0.7`), unusual off-hours login.

3. Ground-truth label (`is_anomaly`) is **only used for evaluation** on the held-out validation set. The Isolation Forest model is trained completely **unsupervised**.

### To regenerate data

```bash
# From the project root
python scripts/generate_sample_data.py
# Output: ml-data/sample_login_data.csv (10,000 rows, 18 features + is_anomaly)
```

---

## Canonical Feature Set (18 Features)

| Feature | Type | Description |
|---------|------|-------------|
| `failed_attempts_15min` | int | Number of failed login attempts for this user in the prior 15 minutes |
| `failed_attempts_1h` | int | Number of failed login attempts for this user in the prior 1 hour |
| `is_new_device` | int (0/1) | 1 if device fingerprint has never been associated with this user before |
| `is_new_ip` | int (0/1) | 1 if full IP address is previously unseen for this user |
| `is_new_ip_subnet` | int (0/1) | 1 if IP /24 subnet has never been seen for this user |
| `login_hour_sin` | float | Cyclical sine encoding of the login hour (`sin(2π * hour / 24)`) |
| `login_hour_cos` | float | Cyclical cosine encoding of the login hour (`cos(2π * hour / 24)`) |
| `is_unusual_hour` | int (0/1) | 1 if login falls outside the user's normal daytime window (before 6 AM or after 10 PM) |
| `logins_last_hour` | int | Total login attempts across all devices for this user in the last hour |
| `logins_last_24h` | int | Total login attempts for this user in the last 24 hours |
| `seconds_since_last_login_log` | float | Natural log (`ln(1 + gap_seconds)`) of elapsed time since previous login |
| `geo_distance_km` | float | Haversine distance in kilometers from the user's last known login location |
| `country_changed` | int (0/1) | 1 if geolocation country differs from user's last successful login country |
| `impossible_travel_flag` | int (0/1) | 1 if required travel speed between consecutive logins exceeds 800 km/h |
| `browser_changed` | int (0/1) | 1 if browser family differs from user's primary registered browser |
| `os_changed` | int (0/1) | 1 if operating system family differs from user's primary registered OS |
| `ua_rarity_score` | float (0–1) | Heuristic score reflecting user-agent string abnormality / rarity |
| `deviation_from_baseline` | float (0–1) | Normalized behavioral deviation from user's typical login cadence |
| `is_anomaly` *(label)* | int (0/1) | **Evaluation only**; 1 for synthetic attack pattern, 0 for legitimate traffic |

---

## Limitations

| Limitation | Detail |
|-----------|--------|
| **Synthetic distributions** | Distributions are modeled with standard parametric functions, not real production telemetry. |
| **No concept drift** | Static data distribution does not simulate adversary adaptation over time. |
| **Relative anomaly scores** | Isolation Forest scores measure path length isolation, not calibrated Bayesian probabilities. |
| **Clean separability** | Synthetic anomalies are generated with distinct parameter shifts, leading to higher separation than noisy real-world logs. |

---

## Regeneration & Pipeline Flow

```text
scripts/generate_sample_data.py  →  ml-data/sample_login_data.csv (10,000 rows)
                                           ↓
scripts/train_model.py           →  backend/models/model.joblib
                                    backend/models/scaler.joblib
                                    backend/models/model_metadata.json
                                           ↓
backend/app/ml/inference.py      →  Inference at /api/auth/login and /api/logins/simulate
```
