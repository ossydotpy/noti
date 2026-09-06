import secrets
import string

from django.db import IntegrityError

_ALPHABET = string.ascii_lowercase + string.digits


def random_slug(length: int = 8) -> str:
    """Random URL-safe lowercase slug (no dictionary words, collision-friendly)."""
    return "".join(secrets.choice(_ALPHABET) for _ in range(length))


def generate_unique_slug(model, length: int = 8, max_attempts: int = 10) -> str:
    """Generates a random slug guaranteed unique against ``model.slug``."""
    for _ in range(max_attempts):
        slug = random_slug(length)
        if not model.objects.filter(slug=slug).exists():
            return slug
    # Astronomically unlikely; lengthen and retry once more with integrity check
    while True:
        slug = random_slug(length + 4)
        try:
            model.objects.filter(slug=slug).exists()
            return slug
        except IntegrityError:
            continue
