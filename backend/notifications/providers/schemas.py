from pydantic import BaseModel, ConfigDict


class BaseProviderConfig(BaseModel):
    """Base config schema for all providers. Forbids unknown keys."""

    model_config = ConfigDict(extra="forbid")
