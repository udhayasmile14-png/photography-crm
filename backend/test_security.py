import unittest
from fastapi.testclient import TestClient
from main import app
import database, models

class TestTenantSecurity(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        # Verify both studios are present or register them
        # Let's register Studio A and Studio B for clean testing
        db = next(database.get_db())
        
        # Clean test entries
        db.query(models.User).filter(models.User.email.in_(["test_a@studio.com", "test_b@studio.com"])).delete(synchronize_session=False)
        db.commit()

        # Register Studio A
        reg_a = self.client.post("/api/auth/register", json={
            "name": "User A",
            "email": "test_a@studio.com",
            "password": "securepassword123",
            "studio_name": "Test Studio A"
        })
        self.assertEqual(reg_a.status_code, 201)

        # Login Studio A to get JWT
        login_a = self.client.post("/api/auth/login", data={
            "username": "test_a@studio.com",
            "password": "securepassword123"
        })
        self.assertEqual(login_a.status_code, 200)
        self.token_a = login_a.json()["access_token"]
        self.studio_a_id = login_a.json()["studio_id"]

        # Register Studio B
        reg_b = self.client.post("/api/auth/register", json={
            "name": "User B",
            "email": "test_b@studio.com",
            "password": "securepassword123",
            "studio_name": "Test Studio B"
        })
        self.assertEqual(reg_b.status_code, 201)

        # Login Studio B to get JWT
        login_b = self.client.post("/api/auth/login", data={
            "username": "test_b@studio.com",
            "password": "securepassword123"
        })
        self.assertEqual(login_b.status_code, 200)
        self.token_b = login_b.json()["access_token"]
        self.studio_b_id = login_b.json()["studio_id"]

    def test_horizontal_privilege_escalation(self):
        # 1. Studio A creates a client and booking
        headers_a = {"Authorization": f"Bearer {self.token_a}"}
        
        client_res = self.client.post("/api/clients", json={
            "name": "Target Client",
            "email": "target@client.com"
        }, headers=headers_a)
        self.assertEqual(client_res.status_code, 200)
        client_id = client_res.json()["id"]

        booking_res = self.client.post("/api/bookings", json={
            "client_id": client_id,
            "session_type": "Portrait",
            "scheduled_at": "2026-10-10T12:00:00",
            "price": 500.0
        }, headers=headers_a)
        self.assertEqual(booking_res.status_code, 200)
        booking_id = booking_res.json()["id"]

        # 2. Studio A creates a contract
        contract_res = self.client.post("/api/contracts", json={
            "booking_id": booking_id,
            "client_id": client_id,
            "title": "Confidential NDA Agreement",
            "content": "Secret terms that only Studio A and Target Client should read."
        }, headers=headers_a)
        self.assertEqual(contract_res.status_code, 200)
        contract_id = contract_res.json()["id"]

        # 3. Studio B (different tenant) tries to read Studio A's contract by ID
        # Assert that it receives a 403 Forbidden or 404 Not Found error
        headers_b = {"Authorization": f"Bearer {self.token_b}"}
        forbidden_res = self.client.get(f"/api/contracts/{contract_id}", headers=headers_b)
        
        # We assert that the security check blocked Studio B
        print(f"\n[Security Test] Studio B status code when accessing Studio A contract: {forbidden_res.status_code}")
        self.assertIn(forbidden_res.status_code, [403, 404])
        self.assertIn("detail", forbidden_res.json())

    def test_contract_immutability(self):
        # 1. Studio A creates a client, booking, and contract
        headers_a = {"Authorization": f"Bearer {self.token_a}"}
        
        client_res = self.client.post("/api/clients", json={
            "name": "Target Client 2",
            "email": "target2@client.com"
        }, headers=headers_a)
        client_id = client_res.json()["id"]

        booking_res = self.client.post("/api/bookings", json={
            "client_id": client_id,
            "session_type": "Wedding",
            "scheduled_at": "2026-11-11T12:00:00",
            "price": 2000.0
        }, headers=headers_a)
        booking_id = booking_res.json()["id"]

        contract_res = self.client.post("/api/contracts", json={
            "booking_id": booking_id,
            "client_id": client_id,
            "title": "Wedding Agreement",
            "content": "Terms and conditions..."
        }, headers=headers_a)
        contract_id = contract_res.json()["id"]

        # 2. Get secure share token for client portal
        token_res = self.client.get(f"/api/clients/{client_id}/token", headers=headers_a)
        self.assertEqual(token_res.status_code, 200)
        portal_token = token_res.json()["token"]

        # 3. Client signs the contract first time (should succeed)
        sign_res = self.client.post(
            f"/api/public/contracts/{contract_id}/sign?signature_name=Alice&token={portal_token}"
        )
        self.assertEqual(sign_res.status_code, 200)
        contract_data = sign_res.json()
        self.assertEqual(contract_data["status"], "Signed")
        self.assertIsNotNone(contract_data["document_hash"])
        self.assertIsNotNone(contract_data["ip_address"])
        self.assertIsNotNone(contract_data["user_agent"])

        # 4. Attempt to sign the contract a second time (should fail with 400 bad request)
        re_sign_res = self.client.post(
            f"/api/public/contracts/{contract_id}/sign?signature_name=Alice2&token={portal_token}"
        )
        self.assertEqual(re_sign_res.status_code, 400)
        self.assertIn("immutable", re_sign_res.json()["detail"])

if __name__ == "__main__":
    unittest.main()
