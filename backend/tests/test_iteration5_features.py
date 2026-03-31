"""
Test Suite for Iteration 5 Features:
1. Staff frontend access restriction based on permissions
2. WhatsApp notifications integration via Twilio
3. Meta Ads OAuth integration for automatic token acquisition
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@agency.com"
ADMIN_PASSWORD = "admin123"


class TestAdminLogin:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        
        print(f"✓ Admin login successful - Token received")
        return data["access_token"]


class TestUserPermissions:
    """Test staff permissions endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_admin_permissions(self, auth_token):
        """Test that admin gets all permissions"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/user/permissions", headers=headers)
        
        assert response.status_code == 200, f"Permissions endpoint failed: {response.text}"
        data = response.json()
        
        # Verify admin role
        assert data["role"] == "admin", f"Expected admin role, got {data['role']}"
        
        # Verify all permissions are True for admin
        permissions = data.get("permissions", {})
        expected_permissions = [
            "can_manage_clients",
            "can_manage_content",
            "can_view_reports",
            "can_approve_receipts",
            "can_manage_calendar",
            "can_manage_staff",
            "can_manage_meta"
        ]
        
        for perm in expected_permissions:
            assert permissions.get(perm) == True, f"Admin should have {perm}=True"
        
        print(f"✓ Admin permissions verified - All {len(expected_permissions)} permissions are True")


class TestWhatsAppStatus:
    """Test WhatsApp integration status endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_whatsapp_status_endpoint(self, auth_token):
        """Test WhatsApp status endpoint returns proper structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/whatsapp/status", headers=headers)
        
        assert response.status_code == 200, f"WhatsApp status failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "configured" in data, "Missing 'configured' field"
        assert isinstance(data["configured"], bool), "'configured' should be boolean"
        
        # If not configured, from_number should be None
        if not data["configured"]:
            print(f"✓ WhatsApp status: Not configured (expected - no Twilio credentials)")
        else:
            assert "from_number" in data, "Missing 'from_number' when configured"
            print(f"✓ WhatsApp status: Configured with {data['from_number']}")


class TestMetaOAuthStatus:
    """Test Meta OAuth integration status endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_meta_oauth_status_endpoint(self, auth_token):
        """Test Meta OAuth status endpoint returns proper structure"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/meta/oauth/status", headers=headers)
        
        assert response.status_code == 200, f"Meta OAuth status failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "configured" in data, "Missing 'configured' field"
        assert isinstance(data["configured"], bool), "'configured' should be boolean"
        assert "redirect_uri" in data, "Missing 'redirect_uri' field"
        
        if not data["configured"]:
            print(f"✓ Meta OAuth status: Not configured (expected - no META_APP_ID/SECRET)")
        else:
            assert "app_id" in data, "Missing 'app_id' when configured"
            print(f"✓ Meta OAuth status: Configured with app_id {data['app_id']}")


class TestAdminReceipts:
    """Test receipts endpoint for admin"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_all_receipts(self, auth_token):
        """Test admin can get all receipts"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/receipts", headers=headers)
        
        assert response.status_code == 200, f"Get receipts failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Receipts should be a list"
        print(f"✓ Admin receipts endpoint working - {len(data)} receipts found")
    
    def test_get_pending_receipts_count(self, auth_token):
        """Test pending receipts count endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/receipts/pending/count", headers=headers)
        
        assert response.status_code == 200, f"Pending count failed: {response.text}"
        data = response.json()
        
        assert "count" in data, "Missing 'count' field"
        assert isinstance(data["count"], int), "'count' should be integer"
        print(f"✓ Pending receipts count: {data['count']}")


class TestNotifications:
    """Test notifications endpoints"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_notifications(self, auth_token):
        """Test get notifications endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications", headers=headers)
        
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Notifications should be a list"
        print(f"✓ Notifications endpoint working - {len(data)} notifications found")
    
    def test_get_unread_count(self, auth_token):
        """Test unread notifications count"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=headers)
        
        assert response.status_code == 200, f"Unread count failed: {response.text}"
        data = response.json()
        
        assert "count" in data, "Missing 'count' field"
        print(f"✓ Unread notifications count: {data['count']}")


class TestMetaAccounts:
    """Test Meta accounts endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_meta_accounts(self, auth_token):
        """Test get meta accounts endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/meta-accounts", headers=headers)
        
        assert response.status_code == 200, f"Get meta accounts failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Meta accounts should be a list"
        print(f"✓ Meta accounts endpoint working - {len(data)} accounts found")


class TestRevisions:
    """Test revisions endpoint"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_get_revisions(self, auth_token):
        """Test get revisions endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/revisions", headers=headers)
        
        assert response.status_code == 200, f"Get revisions failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Revisions should be a list"
        print(f"✓ Revisions endpoint working - {len(data)} revisions found")


class TestSidebarMenuItems:
    """Test that all required sidebar menu items are accessible"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_staff_endpoint(self, auth_token):
        """Test staff endpoint (for Personel menu)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/staff", headers=headers)
        
        assert response.status_code == 200, f"Staff endpoint failed: {response.text}"
        print(f"✓ Staff endpoint working (Personel menu)")
    
    def test_clients_endpoint(self, auth_token):
        """Test clients endpoint (for Müşteriler menu)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        print(f"✓ Clients endpoint working (Müşteriler menu)")
    
    def test_calendar_events_endpoint(self, auth_token):
        """Test calendar events endpoint (for Takvim menu)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/calendar-events", headers=headers)
        
        assert response.status_code == 200, f"Calendar events failed: {response.text}"
        print(f"✓ Calendar events endpoint working (Takvim menu)")
    
    def test_campaigns_endpoint(self, auth_token):
        """Test campaigns endpoint (for Kampanyalar menu)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        
        assert response.status_code == 200, f"Campaigns endpoint failed: {response.text}"
        print(f"✓ Campaigns endpoint working (Kampanyalar menu)")
    
    def test_activity_logs_endpoint(self, auth_token):
        """Test activity logs endpoint (for Aktivite Logları menu)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=headers)
        
        assert response.status_code == 200, f"Activity logs failed: {response.text}"
        print(f"✓ Activity logs endpoint working (Aktivite Logları menu)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
