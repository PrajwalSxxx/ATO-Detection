# System Architecture & Technical Design

> [!NOTE]
> This document details the software architecture, runtime topology, data flow, and honest operational boundaries of the AI-ATO Detection Platform.

---

## High-Level System Architecture

```mermaid
flowchart TD
    subgraph ClientTier["Client Tier (SPA)"]
        Browser["React 18 Single Page App\n(Vite + TailwindCSS + Lucide Icons)"]
    end

    subgraph Ingress["Ingress & Gateway"]
        Nginx["Nginx Reverse Proxy\n(Port 80 / Docker Container)"]
    end

    subgraph AppTier["Application Tier (FastAPI / Uvicorn)"]
        API["REST API Layer\nMounted at /api/..."]
        
        subgraph CoreServices["Domain Services"]
            Auth["Auth Service\n(Argon2id + JWT + Timing-Safe)"]
            RiskEngine["Risk Engine\n(Transparent Heuristic Weights)"]
            MLInference["ML Inference Service\n(Isolation Forest)"]
            AdaptiveMFA["Adaptive MFA Service\n(OTP Verification & Rate Limiting)"]
            Audit["Audit & Security Logging"]
        end
    end

    subgraph DataTier["Data & Artifact Persistence"]
        DB[("Database\nSQLite (Dev) / PostgreSQL 16 (Prod)")]
        ModelStore["ML Model Artifacts\nmodel.joblib, scaler.joblib, metadata.json"]
    end

    subgraph OfflineScripts["Offline / Setup Utilities"]
        DataGen["scripts/generate_sample_data.py"]
        Trainer["scripts/train_model.py"]
        Seeder["scripts/seed_database.py"]
    end

    Browser -->|HTTP/REST /api/*| Nginx
    Nginx -->|Proxy Pass :8000| API
    Browser -.->|Local Dev Direct :8000| API

    API --> Auth
    API --> RiskEngine
    API --> Audit
    
    Auth --> RiskEngine
    RiskEngine --> MLInference
    RiskEngine --> AdaptiveMFA
    
    MLInference --> ModelStore
    Auth --> DB
    RiskEngine --> DB
    Audit --> DB
    
    DataGen -->|Synthetic CSV| Trainer
    Trainer -->|Fitted Artifacts| ModelStore
    Seeder -->|Seed Data| DB
```

---

## Authentication & Risk Decision Pipeline

Every authentication attempt follows an adaptive decision pipeline combining heuristic rule evaluation with machine learning anomaly detection:

```mermaid
flowchart TD
    Req["1. User submits credentials\nPOST /api/auth/login\n(email, password, fingerprint, geo)"] --> AuthCheck{"2. Argon2id\nPassword Match?"}
    
    AuthCheck -->|Failure| LockCheck["Increment failed_login_count\nAudit Log FAILED_LOGIN"]
    LockCheck --> LockResp["Return 401 Invalid Credentials\n(Timing-safe hash computation)"]
    
    AuthCheck -->|Success| FeatureExtract["3. Feature Engineering\n(Extract 18 canonical features from history)"]
    
    FeatureExtract --> MLScore["4. ML Anomaly Inference\n(Isolation Forest decision_function)"]
    FeatureExtract --> RuleScore["5. Heuristic Scoring\n(Device, IP Subnet, Geo, Velocity, Hours)"]
    
    MLScore --> Composite["6. Composite Risk Score\nscore = clamp(rules + ml_signal, 0, 100)"]
    RuleScore --> Composite
    
    Composite --> TierCheck{"7. Risk Decision?"}
    
    TierCheck -->|Low Risk < 30| Allow["ALLOW\nIssue Bearer JWT\nReset failure count\nLog LOGIN_SUCCESS"]
    TierCheck -->|Medium/High 30-69| MFA["MFA CHALLENGE\nGenerate 6-digit OTP\nCreate MFAVerification session\nReturn session_token"]
    TierCheck -->|Critical Risk ≥ 70| Block["BLOCK\nReject with 403 Forbidden\nRaise SecurityAlert\nLog HIGH_RISK_BLOCKED"]
    
    MFA --> OTPReq["User submits OTP\nPOST /api/auth/mfa/verify"]
    OTPReq --> OTPCheck{"Valid OTP & unexpired?"}
    OTPCheck -->|Yes| Allow
    OTPCheck -->|No| OTPFail["Decrement attempts\nReturn 400 Invalid OTP"]
```

---

## Runtime Topology (Docker Compose)

In a containerized deployment, services communicate across an isolated internal bridge network:

```mermaid
flowchart LR
    HostBrowser["Host Browser\n(http://localhost:5173)"] --> FrontendContainer["frontend\n(Nginx Alpine :80)"]
    FrontendContainer -->|Proxy /api/ to http://backend:8000| BackendContainer["backend\n(FastAPI / Uvicorn :8000)"]
    BackendContainer -->|PostgreSQL connection :5432| DBContainer["db\n(postgres:16-alpine)"]
    
    subgraph Volumes["Mounted Storage"]
        DBVol["postgres_data"] -.-> DBContainer
        ModelVol["backend/models"] -.-> BackendContainer
        DataVol["ml-data"] -.-> BackendContainer
    end
```

---

## Honest Operational Boundaries & Caveats

> [!CAUTION]
> This platform is engineered for educational demonstration, architecture showcases, and security portfolio presentation. It is **not** a production-certified security perimeter.

| Architectural Component | Engineering Implementation | Honest Operational Boundary |
|-------------------------|----------------------------|-----------------------------|
| **ML Anomaly Detection** | Isolation Forest on 18 features | Trained strictly on **synthetic, parametric data**. Real-world attack traffic contains complex noise and zero-days not represented in the generator. |
| **Risk Scoring Weights** | Transparent additive point model | Weights (e.g. 15 pts for new device, 30 pts for ML) are **heuristically defined** rather than learned via maximum likelihood estimation on labeled breach data. |
| **Geo-Location** | In-memory lookup table + Haversine | Uses synthetic IP range mappings for deterministic tests. Production environments require MaxMind GeoIP2 or commercial IP intelligence APIs. |
| **Step-Up MFA** | Cryptographic OTP with Argon2id hash | Dev environment logs OTP to console and returns session tokens. Production requires an external SMS/Email gateway (Twilio, SendGrid) and TOTP authenticator integration. |
| **Behavioral Biometrics** | Vector fields defined in schema | Client-side keystroke dynamics and mouse movement collectors are not bundled in the default React demo forms. |
| **Single Tenant Baseline** | Local SQLite / PostgreSQL | Scoring assumes a single organization context rather than multi-tenant federated identity provider scale. |
