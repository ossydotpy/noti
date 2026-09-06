"""Subscriber Access Token (SAT) service for in-app notification sessions."""

import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple

import jwt
from django.conf import settings
from django.utils import timezone as django_timezone

from notifications.models import Subscriber, SubscriberRefreshToken

logger = logging.getLogger(__name__)


class SubscriberTokenService:
    """Issues and verifies Subscriber Access Tokens (SAT) and Refresh Tokens (SRT)."""

    SAT_PREFIX = "ns_sat_"
    SRT_PREFIX = "ns_srt_"

    @classmethod
    def issue_tokens(
        cls,
        subscriber: Subscriber,
        workspace_id: str,
        requested_sat_expiry: Optional[int] = None,
        requested_srt_expiry: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> Tuple[str, str, SubscriberRefreshToken]:
        """Issue a SAT/SRT pair. Returns (raw_sat, raw_srt, refresh_token_model)."""
        sat_expiry = cls.effective_sat_expiry(requested_sat_expiry)
        srt_expiry = cls.effective_srt_expiry(requested_srt_expiry)

        raw_srt = cls._generate_refresh_token()
        expires_at = django_timezone.now() + timedelta(seconds=srt_expiry)
        refresh_token = SubscriberRefreshToken.objects.create(
            workspace_id=workspace_id,
            subscriber=subscriber,
            token_hash=cls._hash_token(raw_srt),
            expires_at=expires_at,
            metadata=metadata or {},
        )

        raw_sat = cls._generate_sat(
            subscriber_id=str(subscriber.id),
            external_id=subscriber.external_id,
            workspace_id=workspace_id,
            expiry_seconds=sat_expiry,
        )

        logger.info(
            "subscriber_token.issued workspace_id=%s subscriber_id=%s sat_expiry=%s srt_expiry=%s",
            workspace_id,
            subscriber.id,
            sat_expiry,
            srt_expiry,
        )

        return raw_sat, raw_srt, refresh_token

    @classmethod
    def rotate_tokens(
        cls,
        refresh_token: SubscriberRefreshToken,
        requested_sat_expiry: Optional[int] = None,
        metadata: Optional[dict] = None,
    ) -> Tuple[str, str, SubscriberRefreshToken]:
        """Rotate a refresh token and issue a new SAT. Invalidates the old token."""
        if not refresh_token.is_valid:
            raise InvalidRefreshToken("Refresh token is expired or revoked")

        now = django_timezone.now()
        refresh_token.last_used_at = now
        refresh_token.revoked_at = now
        refresh_token.save(update_fields=["last_used_at", "revoked_at"])

        new_sat, new_srt, new_refresh_token = cls.issue_tokens(
            subscriber=refresh_token.subscriber,
            workspace_id=str(refresh_token.workspace_id),
            requested_sat_expiry=requested_sat_expiry,
            metadata=metadata,
        )

        logger.info(
            "subscriber_token.rotated workspace_id=%s subscriber_id=%s old_token_id=%s new_token_id=%s",
            refresh_token.workspace_id,
            refresh_token.subscriber_id,
            refresh_token.id,
            new_refresh_token.id,
        )

        return new_sat, new_srt, new_refresh_token

    @classmethod
    def verify_sat(cls, token: str) -> dict:
        """Verify a SAT JWT and return the decoded payload.

        Raises TokenExpiredError or InvalidTokenError.
        """
        config = settings.SAT_CONFIG

        if token.startswith(cls.SAT_PREFIX):
            token = token[len(cls.SAT_PREFIX):]

        try:
            payload = jwt.decode(
                token,
                key=config["SECRET_KEY"],
                algorithms=[config["ALGORITHM"]],
                audience=config["AUDIENCE"],
                issuer=config["ISSUER"],
                options={
                    "require": ["exp", "iat", "sub", "wid", "aud", "iss", "scope"],
                },
            )

            if "in_app" not in payload.get("scope", []):
                raise InvalidTokenError("Token missing required scope")

            return payload

        except jwt.ExpiredSignatureError:
            raise TokenExpiredError("Token has expired")
        except jwt.InvalidAudienceError:
            raise InvalidTokenError("Invalid audience")
        except jwt.InvalidIssuerError:
            raise InvalidTokenError("Invalid issuer")
        except jwt.InvalidTokenError as e:
            raise InvalidTokenError(f"Invalid token: {str(e)}")

    @classmethod
    def validate_refresh_token(cls, raw_token: str) -> SubscriberRefreshToken:
        """Validate a raw refresh token and return the model instance."""
        if not raw_token.startswith(cls.SRT_PREFIX):
            raise InvalidRefreshToken("Invalid refresh token format")

        try:
            refresh_token = SubscriberRefreshToken.objects.get(
                token_hash=cls._hash_token(raw_token)
            )
        except SubscriberRefreshToken.DoesNotExist:
            logger.error(
                "subscriber_token.refresh_not_found token_prefix=%s",
                raw_token[:16] if len(raw_token) >= 16 else raw_token[:8],
            )
            raise InvalidRefreshToken("Refresh token not found")

        if not refresh_token.is_valid:
            raise InvalidRefreshToken("Refresh token is expired or revoked")

        return refresh_token

    @classmethod
    def revoke_all_subscriber_tokens(cls, subscriber: Subscriber, workspace_id: str) -> int:
        """Revoke all refresh tokens for a subscriber in a workspace."""
        count = SubscriberRefreshToken.objects.filter(
            workspace_id=workspace_id,
            subscriber=subscriber,
            revoked_at__isnull=True,
        ).update(revoked_at=django_timezone.now())

        if count > 0:
            logger.info(
                "subscriber_token.revoked_all workspace_id=%s subscriber_id=%s revoked_count=%s",
                workspace_id,
                subscriber.id,
                count,
            )

        return count

    @classmethod
    def effective_sat_expiry(cls, requested: Optional[int] = None) -> int:
        """Resolve the SAT expiry in seconds, capped by the server maximum."""
        config = settings.SAT_CONFIG
        return min(requested or config["ACCESS_TOKEN_EXPIRY"], config["MAX_ACCESS_TOKEN_EXPIRY"])

    @classmethod
    def effective_srt_expiry(cls, requested: Optional[int] = None) -> int:
        """Resolve the SRT expiry in seconds, capped by the server maximum."""
        config = settings.SAT_CONFIG
        return min(
            requested or config["REFRESH_TOKEN_EXPIRY"], config["MAX_REFRESH_TOKEN_EXPIRY"]
        )

    @classmethod
    def _generate_sat(
        cls, subscriber_id: str, external_id: str, workspace_id: str, expiry_seconds: int
    ) -> str:
        """Generate a Subscriber Access Token (JWT)."""
        config = settings.SAT_CONFIG
        now = datetime.now(timezone.utc)

        payload = {
            "sub": subscriber_id,
            "ext_id": external_id,
            "wid": workspace_id,
            "aud": config["AUDIENCE"],
            "iss": config["ISSUER"],
            "iat": now,
            "exp": now + timedelta(seconds=expiry_seconds),
            "scope": ["in_app"],
            "type": "sat",
        }

        token = jwt.encode(
            payload,
            key=config["SECRET_KEY"],
            algorithm=config["ALGORITHM"],
        )

        return f"{cls.SAT_PREFIX}{token}"

    @classmethod
    def _generate_refresh_token(cls) -> str:
        """Generate a cryptographically secure refresh token."""
        return f"{cls.SRT_PREFIX}{secrets.token_urlsafe(32)}"

    @classmethod
    def _hash_token(cls, raw_token: str) -> str:
        """Hash a token using SHA-256 for storage."""
        return hashlib.sha256(raw_token.encode()).hexdigest()


class TokenError(Exception):
    """Base exception for token errors."""


class InvalidTokenError(TokenError):
    """Raised when a token is invalid or has wrong claims."""


class TokenExpiredError(TokenError):
    """Raised when a token has expired."""


class InvalidRefreshToken(TokenError):
    """Raised when a refresh token is invalid, expired, or revoked."""
