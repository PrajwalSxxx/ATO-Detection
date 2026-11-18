"""Tests for API routes and access control."""
import pytest


def test_root_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_system_health(client):
    response = client.get("/api/system/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "database" in data
    assert "ml_model" in data


def test_dashboard_summary_unauthorized(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code in (401, 403)


def test_dashboard_summary_authorized(client, admin_headers):
    response = client.get("/api/dashboard/summary", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_logins_today" in data
    assert "failed_logins_today" in data
    assert "open_alerts_count" in data


def test_dashboard_decisions(client, admin_headers):
    response = client.get("/api/dashboard/decisions", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "allow" in data
    assert "mfa" in data
    assert "block" in data


def test_dashboard_risk_distribution(client, admin_headers):
    response = client.get("/api/dashboard/risk-distribution", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "low" in data
    assert "medium" in data
    assert "high" in data
    assert "critical" in data


def test_login_events_listing(client, admin_headers):
    response = client.get("/api/logins?page=1&page_size=10", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "total_pages" in data


def test_login_simulation(client, admin_headers):
    response = client.post(
        "/api/logins/simulate",
        json={
            "email": "testuser@test.com",
            "password": "User@SecurePass123",
            "ip_address": "8.8.8.8",
            "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
        },
        headers=admin_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["simulation"] is True
    assert "decision" in data
    assert "risk_score" in data


def test_users_listing(client, admin_headers):
    response = client.get("/api/users?page=1&page_size=10", headers=admin_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1


def test_users_regular_user_forbidden(client, user_headers):
    response = client.get("/api/users", headers=user_headers)
    assert response.status_code == 403


def test_alerts_listing(client, admin_headers):
    response = client.get("/api/alerts?page=1&page_size=10", headers=admin_headers)
    assert response.status_code == 200
    assert "items" in response.json()


def test_devices_listing(client, admin_headers):
    response = client.get("/api/devices?page=1&page_size=10", headers=admin_headers)
    assert response.status_code == 200
    assert "items" in response.json()


def test_settings_listing(client, admin_headers):
    response = client.get("/api/settings", headers=admin_headers)
    assert response.status_code == 200
    settings = response.json()
    assert isinstance(settings, list)
    assert len(settings) >= 1


def test_audit_logs_listing(client, admin_headers):
    response = client.get("/api/audit?page=1&page_size=10", headers=admin_headers)
    assert response.status_code == 200
    assert "items" in response.json()
