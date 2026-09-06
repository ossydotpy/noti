import base64
import hashlib
import json

from cryptography.fernet import Fernet
from django.conf import settings


def _get_fernet_key() -> bytes:
    """Returns a valid 32-byte base64-encoded key for Fernet.

    Prioritizes the FERNET_KEY setting; otherwise derives one from SECRET_KEY.
    """
    key = getattr(settings, "FERNET_KEY", None)
    if key:
        return key.encode() if isinstance(key, str) else key

    secret = settings.SECRET_KEY.encode()
    digest = hashlib.sha256(secret).digest()
    return base64.urlsafe_b64encode(digest)


def encrypt_data(data: dict | list | str) -> bytes:
    """Encrypts a dict, list, or string with Fernet. Returns bytes for BinaryField."""
    if data is None:
        return None

    f = Fernet(_get_fernet_key())
    json_bytes = json.dumps(data).encode("utf-8")
    return f.encrypt(json_bytes)


def decrypt_data(encrypted_data: bytes | memoryview | str) -> dict | list | str | None:
    """Decrypts bytes back to the original Python object."""
    if not encrypted_data:
        return None

    if isinstance(encrypted_data, memoryview):
        encrypted_data = bytes(encrypted_data)

    f = Fernet(_get_fernet_key())
    decrypted_bytes = f.decrypt(encrypted_data)
    return json.loads(decrypted_bytes.decode("utf-8"))
