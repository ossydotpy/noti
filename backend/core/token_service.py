import hashlib
import secrets


def generate_token() -> str:
    """High-entropy URL-safe token for single-use links (invites)."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 hex digest — tokens are high-entropy so a fast hash is safe."""
    return hashlib.sha256(token.encode()).hexdigest()
