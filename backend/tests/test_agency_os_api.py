"""
Agency OS API Tests
Testing: Auth, Clients, Services, Receipts endpoints
Backend uses Supabase for authentication and database
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agency-os-prod.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@agency.com"
ADMIN_PASSWORD = "admin123"

class TestHealthCheck:
    """Health check - Run first to verify API is up"""
    
    def test_api_root_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "running"
        assert data["database"] == "Supabase"
        print(f"✓ API root health check passed - v{data.get('message', '')}")


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_login_with_valid_admin_credentials(self):
        """Test login with admin@agency.com / admin123"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed with status {response.status_code}: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert "user" in data, "No user in response"
        assert data["role"] == "admin", f"Expected admin role, got {data.get('role')}"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"✓ Admin login successful - User: {data['user']['full_name']}")
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@wrong.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials rejected correctly")
    
    def test_login_missing_password(self):
        """Test login without password returns error"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL
        })
        assert response.status_code in [401, 422], f"Expected 401/422, got {response.status_code}"
        print("✓ Missing password rejected correctly")


class TestProtectedEndpoints:
    """Test protected endpoints without authentication"""
    
    def test_clients_without_auth_returns_403(self):
        """Accessing /clients without token should fail"""
        response = requests.get(f"{BASE_URL}/api/clients")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Clients endpoint protected correctly")
    
    def test_receipts_without_auth_returns_403(self):
        """Accessing /receipts without token should fail"""
        response = requests.get(f"{BASE_URL}/api/receipts")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Receipts endpoint protected correctly")


@pytest.fixture
def auth_token():
    """Get authentication token for admin user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Return headers with authorization"""
    return {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }


class TestClientsEndpoint:
    """Clients CRUD tests"""
    
    def test_get_clients_list(self, auth_headers):
        """GET /api/clients should return list"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get clients: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /clients returned {len(data)} clients")
        
        # If clients exist, verify structure
        if len(data) > 0:
            client = data[0]
            assert "id" in client
            assert "company_name" in client
            print(f"  First client: {client.get('company_name')}")
    
    def test_create_client(self, auth_headers):
        """POST /api/clients - Create new client"""
        test_client = {
            "company_name": f"TEST_Deneme_Sirket_{int(time.time())}",
            "contact_name": "Test Kişi",
            "contact_email": f"test{int(time.time())}@test.com",
            "contact_phone": "+905551234567",
            "industry": "Teknoloji"
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", json=test_client, headers=auth_headers)
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        
        data = response.json()
        assert "id" in data, "No ID in created client response"
        assert data["company_name"] == test_client["company_name"]
        assert data["contact_email"] == test_client["contact_email"]
        assert data["status"] == "pending"  # Default status
        print(f"✓ Client created successfully - ID: {data['id']}")
        
        # Cleanup - delete the test client
        cleanup = requests.delete(f"{BASE_URL}/api/clients/{data['id']}", headers=auth_headers)
        if cleanup.status_code == 200:
            print(f"  Cleaned up test client")
    
    def test_create_client_invalid_email(self, auth_headers):
        """POST /api/clients - Invalid email should fail"""
        test_client = {
            "company_name": "TEST_InvalidEmail",
            "contact_name": "Test",
            "contact_email": "not-an-email",
            "contact_phone": "+905551234567",
            "industry": "Test"
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", json=test_client, headers=auth_headers)
        assert response.status_code == 422, f"Expected 422 for invalid email, got {response.status_code}"
        print("✓ Invalid email rejected correctly")


class TestServicesEndpoint:
    """Services endpoint tests"""
    
    def test_get_services_list(self):
        """GET /api/services - Should be public"""
        response = requests.get(f"{BASE_URL}/api/services")
        assert response.status_code == 200, f"Failed to get services: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /services returned {len(data)} services")
        
        # Check service structure if any exist
        if len(data) > 0:
            service = data[0]
            assert "id" in service
            assert "name" in service
            print(f"  Services: {[s.get('name') for s in data[:3]]}")


class TestReceiptsEndpoint:
    """Receipts endpoint tests"""
    
    def test_get_all_receipts(self, auth_headers):
        """GET /api/receipts - Should return receipts with client names"""
        response = requests.get(f"{BASE_URL}/api/receipts", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get receipts: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /receipts returned {len(data)} receipts")
        
        # Check receipt structure if any exist
        if len(data) > 0:
            receipt = data[0]
            assert "id" in receipt
            assert "amount" in receipt
            assert "status" in receipt
            assert "client_name" in receipt  # Joined from clients table
            print(f"  First receipt: {receipt.get('client_name')} - ₺{receipt.get('amount')}")
    
    def test_get_pending_receipts_count(self, auth_headers):
        """GET /api/receipts/pending/count - Badge count"""
        response = requests.get(f"{BASE_URL}/api/receipts/pending/count", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get pending count: {response.text}"
        
        data = response.json()
        assert "count" in data, "No count in response"
        assert isinstance(data["count"], int), "Count should be integer"
        print(f"✓ Pending receipts count: {data['count']}")


class TestDashboardStats:
    """Dashboard statistics endpoint tests"""
    
    def test_admin_dashboard_stats(self, auth_headers):
        """GET /api/stats/admin-dashboard"""
        response = requests.get(f"{BASE_URL}/api/stats/admin-dashboard", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get dashboard stats: {response.text}"
        
        data = response.json()
        assert "total_clients" in data
        assert "active_clients" in data
        assert "videos_produced" in data
        assert "designs_created" in data
        assert "pending_receipts" in data
        
        print(f"✓ Dashboard stats retrieved successfully")
        print(f"  - Total clients: {data['total_clients']}")
        print(f"  - Active clients: {data['active_clients']}")
        print(f"  - Pending receipts: {data['pending_receipts']}")


class TestAuthMeEndpoint:
    """Test /api/auth/me endpoint"""
    
    def test_get_current_user(self, auth_headers):
        """GET /api/auth/me - Get current user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get current user: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "role" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        print(f"✓ /auth/me returned user: {data['email']} ({data['role']})")


class TestCalendarEvents:
    """Calendar events endpoint tests"""
    
    def test_get_calendar_events(self, auth_headers):
        """GET /api/calendar-events - All events for admin"""
        response = requests.get(f"{BASE_URL}/api/calendar-events", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get calendar events: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /calendar-events returned {len(data)} events")


class TestCampaigns:
    """Campaigns endpoint tests"""
    
    def test_get_campaigns(self, auth_headers):
        """GET /api/campaigns"""
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get campaigns: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /campaigns returned {len(data)} campaigns")


class TestNotifications:
    """Notifications endpoint tests"""
    
    def test_get_notifications(self, auth_headers):
        """GET /api/notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get notifications: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /notifications returned {len(data)} notifications")
    
    def test_get_unread_count(self, auth_headers):
        """GET /api/notifications/unread-count"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get unread count: {response.text}"
        
        data = response.json()
        assert "count" in data
        print(f"✓ Unread notifications: {data['count']}")


class TestActivityLogs:
    """Activity logs endpoint tests"""
    
    def test_get_activity_logs(self, auth_headers):
        """GET /api/activity-logs - Admin only"""
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=auth_headers)
        assert response.status_code == 200, f"Failed to get activity logs: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list response"
        print(f"✓ GET /activity-logs returned {len(data)} logs")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
