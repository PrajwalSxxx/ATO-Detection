# API Documentation Reference

> [!TIP]
> The FastAPI backend serves real-time interactive OpenAPI documentation at:
> - **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
> - **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
> - **OpenAPI Specification**: [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Authentication & Role-Based Access Control

All protected endpoints require an HTTP Bearer JWT token in the `Authorization` header:
```http
Authorization: Bearer <access_token>
```
Alternatively, tokens stored in the `access_token` HTTP-only cookie are automatically accepted.

### User Roles
- `admin`: Unrestricted access across identity management, configuration, risk audits, and model reload.
- `analyst`: Read access across dashboard metrics, login telemetry, risk assessments, and write access for alert triage.
- `user`: Standard self-service profile and own login history.

---

## Complete Endpoint Reference

### 1. Root & System Health

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/health` | ❌ | Any | Quick heartbeat check |
| `GET` | `/api/system/health` | ❌ | Any | Deep health status (DB connectivity, ML model state, version) |
| `GET` | `/api/system/ml/status` | ✅ | `admin`, `analyst` | ML model performance metrics, loaded features, training timestamp |
| `POST` | `/api/system/ml/reload` | ✅ | `admin` | Reloads ML model artifacts from disk dynamically |

---

### 2. Authentication (`/api/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/login` | ❌ | Authenticates credentials, extracts telemetry, calculates risk, and issues token or MFA challenge |
| `POST` | `/api/auth/mfa/verify` | ❌ | Submits 6-digit OTP with session token to complete step-up authentication |
| `POST` | `/api/auth/mfa/resend` | ❌ | Requests new OTP (enforces rate-limiting and cooldown) |
| `POST` | `/api/auth/logout` | ❌ | Logs out, invalidates cookies, and records audit trail |

#### Sample Login Request:
```json
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "User123!",
  "device_fingerprint": "a3f890b2c14e",
  "device_name": "Chrome on Windows",
  "latitude": 40.7128,
  "longitude": -74.0060
}
```

#### Sample Responses:
**Immediate Allow (Low Risk):**
```json
{
  "decision": "allow",
  "risk_score": 12.5,
  "risk_level": "low",
  "access_token": "eyJhbGciOi...",
  "token_type": "bearer",
  "expires_in": 1800,
  "user": { "id": "uuid", "email": "user@example.com", "role": "user" }
}
```

**MFA Challenge Triggered (Medium Risk):**
```json
{
  "decision": "mfa",
  "risk_score": 45.0,
  "risk_level": "medium",
  "session_token": "mfa-sess-9b48c...",
  "message": "Step-up authentication required. Enter the OTP sent to your email."
}
```

**Blocked (Critical Risk):**
```json
{
  "decision": "block",
  "risk_score": 88.0,
  "risk_level": "critical",
  "message": "Login blocked due to high-risk anomaly indicators."
}
```

---

### 3. Security Dashboard (`/api/dashboard`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/dashboard/summary` | ✅ | `admin`, `analyst` | Key KPIs: logins today, fail rate, open alerts, average risk |
| `GET` | `/api/dashboard/decisions` | ✅ | `admin`, `analyst` | Breakdown of decisions: allow vs. mfa vs. block |
| `GET` | `/api/dashboard/risk-distribution` | ✅ | `admin`, `analyst` | Distribution counts by severity: low, medium, high, critical |
| `GET` | `/api/dashboard/recent-alerts` | ✅ | `admin`, `analyst` | Top 10 most recent unhandled alerts |
| `GET` | `/api/dashboard/hourly-activity` | ✅ | `admin`, `analyst` | Hourly login and anomaly volume for the last 24 hours |

---

### 4. Login Events & Simulation (`/api/logins`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/logins` | ✅ | `admin`, `analyst` | Paginated list of login attempts with filters (`risk_level`, `success`, `user_id`, `from_date`, `to_date`) |
| `GET` | `/api/logins/{id}` | ✅ | `admin`, `analyst` | Full telemetry detail for a single login event, including feature snapshot |
| `POST` | `/api/logins/simulate` | ✅ | `admin`, `analyst` | Evaluates hypothetical login payload through the risk engine without saving to DB |

---

### 5. Risk Assessments (`/api/risk`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/risk/overview` | ✅ | `admin`, `analyst` | Aggregated analytics on risk scoring trends and factor frequencies |
| `GET` | `/api/risk/{assessment_id}` | ✅ | `admin`, `analyst` | Granular breakdown of individual factor scores, weights, and ML contribution |

---

### 6. Alert Management (`/api/alerts`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/alerts` | ✅ | `admin`, `analyst` | Paginated security alerts with status and severity filters |
| `GET` | `/api/alerts/{id}` | ✅ | `admin`, `analyst` | Single alert details with associated user and login context |
| `PATCH` | `/api/alerts/{id}/status` | ✅ | `admin`, `analyst` | Update status (`investigating`, `resolved`, `false_positive`) and append resolution notes |

---

### 7. User Management (`/api/users`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/users` | ✅ | `admin` | Paginated user list with role and status search |
| `POST` | `/api/users` | ✅ | `admin` | Create new user account |
| `GET` | `/api/users/{id}` | ✅ | `admin`, `analyst` | User profile, lockout status, and MFA settings |
| `PATCH` | `/api/users/{id}` | ✅ | `admin` | Update user details, unlock locked accounts, reset passwords |
| `GET` | `/api/users/{id}/logins` | ✅ | `admin`, `analyst` | Historical login log for a specific user |

---

### 8. Device Registry (`/api/devices`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/devices` | ✅ | `admin`, `analyst` | Paginated device registry |
| `GET` | `/api/devices/{id}` | ✅ | `admin`, `analyst` | Specific device fingerprint and associated user |
| `PATCH` | `/api/devices/{id}/trust` | ✅ | `admin`, `analyst` | Mark device fingerprint as trusted or untrusted |

---

### 9. Application Settings (`/api/settings`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/settings` | ✅ | `admin` | List all dynamic application settings |
| `GET` | `/api/settings/map` | ✅ | `admin` | Key-value dictionary of active settings |
| `PUT` | `/api/settings/{key}` | ✅ | `admin` | Update setting value (e.g. risk thresholds, factor weights) |

---

### 10. Audit Logging (`/api/audit`)

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| `GET` | `/api/audit` | ✅ | `admin` | Paginated administrative and security audit trail |

---

## Standard Error Response Schema

All errors follow a standardized JSON envelope:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password.",
    "request_id": "90dbb612-fc8e-4a81-9ea1-923ad84df5b1"
  }
}
```

### Common Error Codes:
- `400 Bad Request`: `VALIDATION_ERROR`, `INVALID_OTP`, `OTP_EXPIRED`
- `401 Unauthorized`: `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `TOKEN_INVALID`
- `403 Forbidden`: `INSUFFICIENT_PERMISSIONS`, `ACCOUNT_LOCKED`, `LOGIN_BLOCKED`
- `404 Not Found`: `USER_NOT_FOUND`, `EVENT_NOT_FOUND`, `ALERT_NOT_FOUND`
- `422 Unprocessable Entity`: `REQUEST_VALIDATION_ERROR`
- `429 Too Many Requests`: `RATE_LIMIT_EXCEEDED`
- `500 Internal Server Error`: `INTERNAL_SERVER_ERROR`
