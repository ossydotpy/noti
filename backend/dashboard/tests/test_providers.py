from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from dashboard.tests.utils import auth_client, make_user, make_workspace
from notifications.models import Provider


class _StubSchema:
    def model_json_schema(self):
        return {"type": "object"}


class _StubProvider:
    name = "Stub"
    channel = "email"
    config_schema = _StubSchema()
    docs_url = "https://example.com/docs"
    icon_url = ""


class _StubValidatingProvider(_StubProvider):
    @staticmethod
    def validate_config(config):
        return config


class ProviderApiTest(APITestCase):
    def setUp(self):
        self.owner = make_user("owner@example.com")
        self.workspace = make_workspace(self.owner, name="Provider Workspace", slug="provider-ws")
        self.client = auth_client(self.owner, self.workspace)

    def test_list_providers(self):
        Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="My FCM",
            config={
                "project_id": "test",
                "private_key": "test",
                "client_email": "test@test.com",
            },
        )
        response = self.client.get(reverse("dashboard-provider-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["provider_type"], "fcm")

    def test_create_provider(self):
        data = {
            "provider_type": "fcm",
            "name": "New FCM",
            "config": {
                "project_id": "test-proj",
                "private_key": "secret-key",
                "client_email": "service@test-proj.iam.gserviceaccount.com",
            },
        }
        response = self.client.post(reverse("dashboard-provider-list"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Provider.objects.filter(name="New FCM").exists())
        self.assertEqual(response.data["config"]["private_key"], "********")

    def test_create_provider_upserts_existing(self):
        provider = Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="My FCM",
            config={"project_id": "test", "private_key": "test"},
        )
        data = {"provider_type": "fcm", "name": "Renamed FCM", "config": {"project_id": "x"}}
        response = self.client.post(reverse("dashboard-provider-list"), data, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        provider.refresh_from_db()
        self.assertEqual(provider.name, "Renamed FCM")
        self.assertEqual(Provider.objects.filter(provider_type="fcm").count(), 1)

    def test_update_provider_preserving_secrets(self):
        provider = Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="My FCM",
            config={
                "project_id": "test",
                "private_key": "REAL-SECRET",
                "client_email": "test@test.com",
            },
        )
        data = {
            "name": "Updated FCM",
            "config": {
                "project_id": "test",
                "private_key": "********",
                "client_email": "test@test.com",
            },
        }
        response = self.client.patch(
            reverse("dashboard-provider-detail", kwargs={"pk": provider.id}),
            data,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        provider.refresh_from_db()
        self.assertEqual(provider.name, "Updated FCM")
        self.assertEqual(provider.config["private_key"], "REAL-SECRET")

    @patch(
        "dashboard.views.providers.ProviderRegistry.get_all",
        return_value={"stub": _StubProvider},
    )
    def test_available_types(self, _):
        response = self.client.get(reverse("dashboard-provider-available-types"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        keys = [p["key"] for p in response.data]
        self.assertIn("stub", keys)
        self.assertEqual(response.data[0]["schema"], {"type": "object"})

    def test_validate_unknown_provider_type(self):
        response = self.client.post(
            reverse("dashboard-provider-validate"),
            {"provider_type": "nope", "config": {}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")

    @patch(
        "dashboard.views.providers.ProviderRegistry.get",
        return_value=_StubValidatingProvider,
    )
    def test_validate_without_connection_test(self, _):
        response = self.client.post(
            reverse("dashboard-provider-validate"),
            {"provider_type": "stub", "config": {"api_key": "x"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

    def test_test_connection_success(self):
        provider = Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="My FCM",
            config={"project_id": "test", "private_key": "test"},
        )
        with patch(
            "dashboard.views.providers.async_to_sync",
            return_value=lambda provider_instance: (True, "Connection OK"),
        ):
            response = self.client.post(
                reverse("dashboard-provider-test-connection", kwargs={"pk": provider.id})
            )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "success")

    def test_test_connection_failure(self):
        provider = Provider.objects.create(
            workspace=self.workspace,
            provider_type="fcm",
            name="My FCM",
            config={"project_id": "test", "private_key": "test"},
        )
        with patch(
            "dashboard.views.providers.async_to_sync",
            return_value=lambda provider_instance: (False, "Bad credentials"),
        ):
            response = self.client.post(
                reverse("dashboard-provider-test-connection", kwargs={"pk": provider.id})
            )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["status"], "error")
