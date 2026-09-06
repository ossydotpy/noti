import json

from django.db import models

from .utils.crypto import encrypt_data, decrypt_data


class EncryptedJSONField(models.BinaryField):
    """JSON data encrypted at rest with Fernet and stored in a BinaryField."""

    description = "A JSON field that is encrypted at rest using Fernet"

    def __init__(self, *args, **kwargs):
        kwargs.setdefault("editable", True)
        super().__init__(*args, **kwargs)

    def get_prep_value(self, value):
        if value is None:
            return None
        return encrypt_data(value)

    def from_db_value(self, value, expression, connection):
        if value is None:
            return None
        return decrypt_data(value)

    def to_python(self, value):
        if value is None or isinstance(value, (dict, list)):
            return value
        return decrypt_data(value)

    def value_to_string(self, obj):
        value = self.value_from_object(obj)
        return json.dumps(value)
