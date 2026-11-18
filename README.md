# AI-Based Identity Attack & Account Takeover (ATO) Detection Platform

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-Paper%20%26%20Ink-38B2AC?logo=tailwind-css&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.5+-F7931E?logo=scikit-learn&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Tests](https://img.shields.io/badge/Tests-32%20Passed-2F7D5B?logo=pytest)
![Design](https://img.shields.io/badge/Design-Paper%20%26%20Ink-161616)
![License](https://img.shields.io/badge/License-MIT-green)

A production-grade, end-to-end **Identity Threat Detection & Response (ITDR)** and **Account Takeover (ATO) Prevention Platform**. The system evaluates *how* and *from where* authentication attempts happen—not merely whether the password is correct—by orchestrating transparent security heuristics with unsupervised Machine Learning (**Isolation Forest**) to take immediate adaptive action: **ALLOW**, **REQUIRE MFA**, or **BLOCK**.

Engineered with a high-craft **"Paper & Ink" editorial design system** inspired by Notion, Linear (light), Figma, and Stripe documentation.

---

## ⚠️ Mandatory Honesty & Scientific Limitations

> This platform is an engineering reference implementation and advanced portfolio system. In accordance with strict engineering integrity standards, the following real-world boundaries are disclosed:

| Principle | Technical Reality |
|---|---|
| **Anomaly ≠ Takeover** | Isolation Forest detects *geometric statistical outliers* in an 18-dimensional feature space. It does **not** confirm account compromise. |
| **Uncalibrated Scores** | Anomaly scores indicate relative distance from baseline. They are **not** calibrated probabilities and are never displayed as a "% chance of attack". |
| **Synthetic Training Data** | Baseline models are trained on parametric synthetic distributions (`ml-data/sample_login_data.csv`). Synthetic traffic does **not** represent real-world APT adversaries. |
| **VPN & Geo Limitations** | VPN usage or an IP location change alone is **not** definitive proof of malicious intent. Geolocation coordinates in demo environments use deterministic simulated mappings. |
| **Step-Up Verification** | Argon2id OTP hashing and session state transitions are authentic. In local development mode, one-time passcodes are displayed on-screen and logged rather than sent via commercial SMS/email gateways. |

---

## 🎨 Design System: "Paper & Ink"

The frontend interface completely eschews generic dark-mode tropes, neon glows, and blur glassmorphism in favor of a calm, architectural, print-editorial aesthetic:

- **Paper & Ink Palette:** Warm off-white surfaces (`--paper: #F8F7F3`), pure white cards (`--paper-raised: #FFFFFF`), and sunken table headers (`--paper-sunken: #F1EFE9`) paired with near-black ink typography (`--ink: #161616`).
- **Browser-Window Motif (`WindowFrame`):** Crisp 1px borders, a title bar with three 6px unfilled ink dots, and a signature hard offset shadow (`3px 3px 0 0 #161616`).
- **Editorial Typography:** Display Serif (`Instrument Serif` / `Fraunces`) for H1 headers and KPI metrics; Technical Sans (`Inter`) for data density; Tabular Monospace (`JetBrains Mono`) for IPs, UUIDs, and telemetry scores.
- **Muted Semantic Palette:** WCAG AA-compliant tints:
  - **ALLOW / Low Risk:** `#2F7D5B` on `#E6F1EA`
  - **REQUIRE MFA / Medium Risk:** `#B7791F` on `#F8EFD9`
  - **BLOCK / High Risk:** `#B3382C` on `#F6E2DE`
  - **Critical Anomaly:** `#8F1D14` on `#F1D4CF`
- **Original Vector Art:** Custom line-drawn vector illustrations including the Security Analyst at laptop, 3-tier architectural evaluation planes, scanning radar loaders, and blueprint empty states.

---

## 🏛️ System Architecture

```
React 18 SPA (Vite + Tailwind CSS + Framer Motion)
   │
   │  REST / JSON (JWT Bearer Auth)
   ▼
FastAPI Backend (Python 3.11+)
   ├─ api/routes/          Thin controllers (Auth, Dashboard, Logins, Risk, Users, Alerts, Devices, Settings, Audit)
   ├─ core/                Argon2id hashing, JWT, rate limiting, structured logging, typed config
   ├─ services/            AuthService, RiskService, AdaptiveAuthService, GeoService, Telemetry, Alerts, Audit
   ├─ ml/                  18-dimensional feature pipeline, Isolation Forest inference, model registry
   ├─ models/              SQLAlchemy 2.0 ORM models (Users, LoginEvents, Devices, RiskAssessments, Alerts...)
   └─ database/            Dual-engine support: SQLite (local dev) / PostgreSQL 16 (production)
```

---

## 🌲 Machine Learning Anomaly Pipeline

The inference pipeline extracts an **18-dimensional canonical feature vector** for every authentication request:

```
[1] failed_attempts_15min        [7]  login_hour_cos                 [13] country_changed
[2] failed_attempts_1h           [8]  is_unusual_hour (06:00-22:00)  [14] impossible_travel_flag (>800 km/h)
[3] is_new_device                [9]  logins_last_hour               [15] browser_changed
[4] is_new_ip                    [10] logins_last_24h                [16] os_changed
[5] is_new_ip_subnet (/24)       [11] seconds_since_last_login_log   [17] ua_rarity_score
[6] login_hour_sin               [12] geo_distance_km (Haversine)    [18] deviation_from_baseline
```

- **Algorithm:** Scikit-learn `IsolationForest` (200 decision estimators, contamination rate 0.07).
- **Latency Budget:** Inference executes in **< 50ms**, mapped smoothly into a 0–30 point risk signal with heuristic fallbacks.

---

## ⚖️ Hybrid Risk Scoring & Policy Engine

Composite risk (0–100) is evaluated using a transparent, deterministic additive point formula:

$$\text{Composite Risk} = \text{clamp}\left(\sum \text{Heuristic Points} + \text{ML Points} + \text{Bonuses} - \text{Trust Discounts},\ 0,\ 100\right)$$

| Component | Max Points | Trigger Condition |
|---|---|---|
| **ML Outlier Signal** | 30 | Isolation Forest decision function anomaly distance |
| **New Device Fingerprint** | 15 | Unrecognized canvas/header hardware fingerprint |
| **New /24 IP Subnet** | 10 | Unrecognized public IP range |
| **Failed Attempt Velocity** | 15 | Consecutive authentication failure bursts |
| **Impossible Geovelocity** | 15 | Physical travel speed exceeding 800 km/h |
| **Location / Country Shift**| 12 | New country code or Haversine distance > 500 km |
| **Temporal Off-Hours** | 8 | Login outside 06:00–22:00 user baseline window |
| **Client Environment Shift**| 5 | Altered OS or browser family |
| **Correlated Interaction** | +5 | Co-occurrence of new device AND cross-border location |
| **Known Device Discount** | -5 | Verified enrolled device + known subnet + normal hour |

### Adaptive Policy Decisions
- **Score 0 – 30 (`LOW`):** **ALLOW** → Frictionless access, JWT issued immediately.
- **Score 31 – 70 (`MEDIUM`):** **REQUIRE MFA** → Step-up challenge; 6-digit OTP dispatched.
- **Score 71 – 100 (`HIGH / CRITICAL`):** **BLOCK** → Session denied (HTTP 403); incident logged to SOC triage queue.

---

## 👥 Seeded Demo Accounts

The local database comes pre-seeded with realistic identities to test all decision branches:

| Email | Password | Role | Expected Behavior |
|---|---|---|---|
| `admin@ato-platform.com` | `Admin@SecurePass123` | `System Admin` | Full administrative control, threshold configuration, manual user provisioning |
| `analyst@ato-platform.com` | `Analyst@SecurePass123` | `Security Analyst` | SOC triage, audit log export, alert investigation |
| `user1@test.com` | `User@SecurePass123` | `Alice Johnson` | **Triggers Adaptive Step-Up MFA Challenge** (unrecognized device) |
| `user2@test.com` | `User@SecurePass123` | `Bob Smith` | Baseline low-risk frictionless authentication |

*The login page includes 1-click quick-fill buttons for all demo accounts.*

---

## 🖥️ Screen-by-Screen Features

1. **Authentication Gateway (`/login`):** Split layout with isometric wireframe evaluation planes, 3 decision preview cards, WindowFrame form, and segmented 6-digit OTP verification.
2. **SOC Operations Dashboard (`/`):** Real-time greeting strip with custom analyst line illustration, 8 display-serif KPI cards, authentication velocity chart, decision donut, and live event stream.
3. **Authentication Ledger (`/logins`):** High-density audit trail with multi-filter toolbars (search, risk band, decision policy, simulation flag) and live inspection drawer.
4. **Threat Detection Engine (`/threat-detection`):** Real-time model inspection, ROC-AUC and F1 scores, 18-feature vector breakdown, and high-confidence anomaly tables.
5. **Risk & Anomaly Analytics (`/risk-analytics`):** Longitudinal 7d/30d trend lines, horizontal top-targeted accounts chart, 7×24 temporal off-hours heatmap, and factor contribution bars.
6. **User Identity Directory (`/users`):** Account roster with active risk scores, provision user drawer, and enrolled hardware inspection.
7. **Security Alerts & Incidents (`/alerts`):** Incident queue, severity chips, resolution workflow drawer, and technical telemetry evidence viewer.
8. **Enrolled Hardware Inventory (`/devices`):** Client browser and device fingerprint tracking, trust authorization toggles, and fingerprint mutation flags.
9. **Immutable Audit Ledger (`/audit-logs`):** Tamper-evident administrative action log with JSON metadata popovers and CSV export.
10. **Security Configuration (`/settings`):** Dynamic risk cutoff sliders (Low/High), OTP expiration window controls, and system diagnostics.
11. **Attack Vector Simulator (`/simulator`):** Trigger 7 realistic attack vectors (Credential Spray, Impossible Travel, Tor Exit Node, Unusual Hours) with a connected 5-stage wireframe trace and live risk scoring.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python:** 3.11 or higher
- **Node.js:** 18.x or higher (`npm` included)
- **Git**

---

### Option A: Native Local Setup (Recommended for Development)

#### 1. Clone the Repository
```bash
git clone https://github.com/PrajwalSxxx/ATO-Detection.git
cd ATO-Detection
```

#### 2. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations and seed default data
python -m app.database.init_db

# Start FastAPI development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Backend API will be running at [http://127.0.0.1:8000](http://127.0.0.1:8000)*
*Interactive Swagger Documentation available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)*

#### 3. Frontend Setup (In a New Terminal)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
*Frontend application will be accessible at [http://127.0.0.1:5173](http://127.0.0.1:5173)*

---

### Option B: Docker Compose (One-Command Full-Stack Setup)

Ensure Docker Desktop is running:
```bash
docker compose up --build
```
This orchestrates:
- **FastAPI Backend:** Containerized Python 3.11 ASGI service.
- **React Frontend:** Nginx-backed production bundle with `/api` reverse proxy.
- **PostgreSQL 16:** Relational database storage.

---

## 🧪 Testing & Verification

### Backend Automated Test Suite
```bash
cd backend
pytest -v
```
**Test Coverage Summary (32/32 Passed):**
- `tests/test_auth.py` — Argon2id password hashing, timing-safe lookup, JWT issue/decode, OTP generation/validation.
- `tests/test_risk.py` — Low-risk trust reduction, impossible velocity calculation, device novelty scoring.
- `tests/test_ml.py` — 18-feature vector extraction, model registry thread safety, graceful fallback.
- `tests/test_api.py` — RBAC permissions, dashboard summaries, simulator endpoints, audit logging.

### Frontend Production Build Test
```bash
cd frontend
npm run build
```
*Compiles cleanly with zero errors in ~6.5 seconds.*

---

## 📦 Pushing Updates to the GitHub Repository

To push changes to your remote repository at `https://github.com/PrajwalSxxx/ATO-Detection.git`:

```bash
# 1. Initialize git if not already present
git init -b main

# 2. Add the remote repository
git remote add origin https://github.com/PrajwalSxxx/ATO-Detection.git

# 3. Stage all project files
git add .

# 4. Commit with a structured message
git commit -m "feat: complete AI-ATO Detection platform with Paper & Ink design system"

# 5. Push to GitHub main branch
git push -u origin main
```

*(If the remote repository already contains an initial commit or README created on GitHub, synchronize first with `git pull origin main --rebase`, then `git push -u origin main`)*

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
