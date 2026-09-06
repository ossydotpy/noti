import hashlib
import json
from functools import lru_cache
from typing import Any, Dict

import firebase_admin
from firebase_admin import credentials, exceptions, messaging
from pydantic import Field

from notifications.providers.base import BaseProvider, ProviderResult
from notifications.providers.schemas import BaseProviderConfig


class FcmConfig(BaseProviderConfig):
    """Configuration schema for FCM service account credentials."""

    project_id: str = Field(..., description="Firebase project ID")
    private_key: str = Field(..., description="Service account private key")
    client_email: str = Field(..., description="Service account client email")
    client_id: str | None = Field(None, description="Service account client ID")
    token_uri: str = Field(
        "https://oauth2.googleapis.com/token",
        description="OAuth token URI",
    )


class FcmProvider(BaseProvider):
    key = "fcm"
    name = "Firebase Cloud Messaging"
    channel = "push"
    docs_url = "https://firebase.google.com/docs/cloud-messaging"
    icon_url = "/icons/providers/fcm.svg"
    config_schema = FcmConfig

    def send(self, delivery, config: Dict[str, Any]) -> ProviderResult:
        try:
            message_id = _send_push(delivery, config)
            return ProviderResult(status="sent", external_id=message_id)
        except messaging.UnregisteredError:
            return ProviderResult(
                status="failed",
                error_message="registration-token-not-registered",
            )
        except exceptions.InvalidArgumentError:
            return ProviderResult(
                status="failed",
                error_message="invalid-argument",
            )
        except messaging.QuotaExceededError:
            return ProviderResult(
                status="failed",
                error_message="quota-exceeded",
            )
        except messaging.SenderIdMismatchError:
            return ProviderResult(
                status="failed",
                error_message="sender-id-mismatch",
            )
        except exceptions.FirebaseError as exc:
            return ProviderResult(
                status="failed", error_message=f"{exc.code}: {str(exc)}"
            )
        except Exception as exc:
            return ProviderResult(status="failed", error_message=str(exc))

    def test_connection(self, config: Dict[str, Any]) -> tuple[bool, str]:
        """Test the credentials by authenticating and dry-run sending a message."""
        try:
            app = _get_or_init_app(config)
            message = messaging.Message(
                token="dummy-token-for-validation",
                notification=messaging.Notification(title="Test", body="Test"),
            )
            try:
                messaging.send(message, app=app, dry_run=True)
            except messaging.UnregisteredError:
                return (
                    True,
                    "Credentials are valid (successfully authenticated with Firebase).",
                )
            except exceptions.FirebaseError as e:
                if e.code in ["PERMISSION_DENIED", "UNAUTHENTICATED"]:
                    return False, f"Firebase authentication failed: {str(e)}"
                return False, f"Firebase API error: {str(e)}"

            return True, "Credentials are valid."
        except Exception as e:
            return False, f"Validation failed: {str(e)}"


def _send_push(delivery, config: Dict[str, Any]) -> str:
    app = _get_or_init_app(config)

    message = messaging.Message(
        token=delivery.target_address,
        notification=messaging.Notification(
            title=delivery.notification.title,
            body=delivery.notification.body,
            image=delivery.notification.image_url,
        ),
        data=_stringify_data(delivery.notification.data or {}),
    )

    return messaging.send(message, app=app)


def _stringify_data(data: Dict[str, Any]) -> Dict[str, str]:
    return {key: str(value) for key, value in data.items()}


def _get_or_init_app(config: Dict[str, Any]) -> firebase_admin.App:
    payload = json.dumps(config, sort_keys=True)
    return _init_firebase_app(payload)


@lru_cache(maxsize=32)
def _init_firebase_app(payload: str) -> firebase_admin.App:
    config = json.loads(payload)
    app_name = f"fcm-{hashlib.sha256(payload.encode('utf-8')).hexdigest()}"

    try:
        return firebase_admin.get_app(app_name)
    except ValueError:
        cred = credentials.Certificate(config)
        return firebase_admin.initialize_app(cred, name=app_name)
