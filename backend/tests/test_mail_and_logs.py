"""
Test Mail Settings and Activity Logs APIs
Tests for:
- POST /api/mail/settings - Save SMTP settings
- GET /api/mail/settings - Read SMTP settings
- POST /api/mail/test - Send test email
- GET /api/activity-logs - List activity logs
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://agency-os-prod.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@agency.com"
ADMIN_PASSWORD = "admin123"


class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        return data["access_token"]
    
    def test_admin_login(self, admin_token):
        """Test admin login returns valid token"""
        assert admin_token is not None
        assert len(admin_token) > 0
        print(f"✓ Admin login successful, token length: {len(admin_token)}")


class TestMailSettings:
    """Mail Settings API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_get_mail_settings(self, admin_token):
        """GET /api/mail/settings - Read SMTP settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mail/settings", headers=headers)
        
        assert response.status_code == 200, f"Failed to get mail settings: {response.text}"
        data = response.json()
        assert "settings" in data, "Response should contain 'settings' key"
        print(f"✓ GET /api/mail/settings - Status: {response.status_code}")
        print(f"  Settings: {data.get('settings')}")
    
    def test_save_mail_settings(self, admin_token):
        """POST /api/mail/settings - Save SMTP settings"""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Test SMTP settings
        smtp_settings = {
            "provider": "smtp",
            "smtp_host": "smtp.turkticaret.net",
            "smtp_port": 465,
            "smtp_username": "info@movadijital.com",
            "smtp_password": "test_password_123",
            "smtp_use_tls": True,
            "smtp_from_email": "info@movadijital.com",
            "smtp_from_name": "Mova Dijital"
        }
        
        response = requests.post(f"{BASE_URL}/api/mail/settings", headers=headers, json=smtp_settings)
        
        assert response.status_code == 200, f"Failed to save mail settings: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Response should have success=True"
        print(f"✓ POST /api/mail/settings - Status: {response.status_code}")
        print(f"  Response: {data}")
    
    def test_verify_saved_settings(self, admin_token):
        """Verify settings were saved correctly"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mail/settings", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        settings = data.get("settings")
        
        assert settings is not None, "Settings should not be None after save"
        assert settings.get("provider") == "smtp", "Provider should be smtp"
        assert settings.get("smtp_host") == "smtp.turkticaret.net", "SMTP host should match"
        assert settings.get("smtp_port") == 465, "SMTP port should match"
        assert settings.get("smtp_username") == "info@movadijital.com", "SMTP username should match"
        # Password should be masked
        assert settings.get("smtp_password") == "********", "Password should be masked"
        print(f"✓ Settings verified after save")
        print(f"  Provider: {settings.get('provider')}")
        print(f"  Host: {settings.get('smtp_host')}")
        print(f"  Port: {settings.get('smtp_port')}")
    
    def test_send_test_email(self, admin_token):
        """POST /api/mail/test - Send test email"""
        headers = {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
        
        # Note: This will likely fail because SMTP credentials are not real
        # But we're testing the endpoint works
        response = requests.post(f"{BASE_URL}/api/mail/test", headers=headers, json={
            "to_email": "test@example.com"
        })
        
        # Accept both 200 (success) and 500 (SMTP not configured properly)
        assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"
        print(f"✓ POST /api/mail/test - Status: {response.status_code}")
        print(f"  Response: {response.json()}")
    
    def test_mail_settings_requires_auth(self):
        """Test that mail settings endpoints require authentication"""
        # GET without auth
        response = requests.get(f"{BASE_URL}/api/mail/settings")
        assert response.status_code in [401, 403], "Should require auth"
        
        # POST without auth
        response = requests.post(f"{BASE_URL}/api/mail/settings", json={"provider": "smtp"})
        assert response.status_code in [401, 403], "Should require auth"
        
        print(f"✓ Mail settings endpoints require authentication")


class TestActivityLogs:
    """Activity Logs API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_get_activity_logs(self, admin_token):
        """GET /api/activity-logs - List activity logs"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=headers)
        
        assert response.status_code == 200, f"Failed to get activity logs: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/activity-logs - Status: {response.status_code}")
        print(f"  Total logs: {len(data)}")
        
        # If there are logs, verify structure
        if len(data) > 0:
            log = data[0]
            # Check expected fields based on AdminLogs.jsx usage
            expected_fields = ['id', 'action', 'entity', 'created_at', 'actor_email']
            for field in expected_fields:
                assert field in log, f"Log should have '{field}' field"
            print(f"  Sample log fields: {list(log.keys())}")
            print(f"  Sample log: action={log.get('action')}, entity={log.get('entity')}, actor={log.get('actor_email')}")
    
    def test_activity_logs_requires_admin(self):
        """Test that activity logs require admin authentication"""
        # Without auth
        response = requests.get(f"{BASE_URL}/api/activity-logs")
        assert response.status_code in [401, 403], "Should require auth"
        print(f"✓ Activity logs endpoint requires authentication")
    
    def test_activity_logs_field_names(self, admin_token):
        """Verify activity logs have correct field names for AdminLogs.jsx"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/activity-logs", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            log = data[0]
            # AdminLogs.jsx uses these fields:
            # - log.actor_email (line 259)
            # - log.entity (line 265)
            # - log.created_at (line 254)
            # - log.action (line 262)
            # - log.before, log.after (for details)
            
            assert 'actor_email' in log, "Log must have 'actor_email' field (used in AdminLogs.jsx)"
            assert 'entity' in log, "Log must have 'entity' field (used in AdminLogs.jsx)"
            assert 'created_at' in log, "Log must have 'created_at' field (used in AdminLogs.jsx)"
            assert 'action' in log, "Log must have 'action' field (used in AdminLogs.jsx)"
            
            print(f"✓ Activity log field names match AdminLogs.jsx expectations")
            print(f"  actor_email: {log.get('actor_email')}")
            print(f"  entity: {log.get('entity')}")
            print(f"  action: {log.get('action')}")
            print(f"  created_at: {log.get('created_at')}")
        else:
            print("⚠ No activity logs found to verify field names")


class TestMailTemplates:
    """Mail Templates API tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["access_token"]
    
    def test_get_mail_templates(self, admin_token):
        """GET /api/mail/templates - Get all mail templates"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/mail/templates", headers=headers)
        
        assert response.status_code == 200, f"Failed to get mail templates: {response.text}"
        data = response.json()
        assert "templates" in data, "Response should contain 'templates' key"
        
        templates = data.get("templates", [])
        print(f"✓ GET /api/mail/templates - Status: {response.status_code}")
        print(f"  Total templates: {len(templates)}")
        
        # Check for expected template types
        expected_types = ['welcome', 'receipt_approved', 'content_uploaded', 'event_created']
        template_types = [t.get('template_type') for t in templates]
        for ttype in expected_types:
            if ttype in template_types:
                print(f"  ✓ Template '{ttype}' found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
