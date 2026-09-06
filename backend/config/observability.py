"""OpenTelemetry setup: traces + logs over OTLP, env-gated and off by default.

Users point OTEL_EXPORTER_OTLP_ENDPOINT at any OTLP-compatible backend
(Jaeger, Grafana Tempo, Datadog, Honeycomb, ...). Standard OTEL_* env vars
apply (protocol, resource attributes, exporters).
"""

import logging
import os

from django.conf import settings

PII_ATTRIBUTE_KEYS = frozenset(
    {
        "email",
        "user_email",
        "new_email",
        "removed_email",
        "invite_email",
        "recipient_email",
        "subscriber_email",
        "phone",
        "phone_number",
        "full_name",
        "first_name",
        "last_name",
    }
)


def mask_pii_value(key: str, value: str) -> str:
    if key in {"email", "user_email", "new_email", "removed_email", "invite_email",
               "recipient_email", "subscriber_email"} and "@" in value:
        prefix, _, domain = value.partition("@")
        if len(prefix) > 2:
            prefix = prefix[0] + "*" * (len(prefix) - 2) + prefix[-1]
        else:
            prefix = "*"
        return f"{prefix}@{domain}"
    if key in {"phone", "phone_number"} and len(value) > 4:
        return "*" * (len(value) - 4) + value[-4:]
    if key in {"full_name", "first_name", "last_name"}:
        return value[0] + "***" if value else "***"
    return "[MASKED]"


def mask_pii_processor(span, log_record=None):
    """Scrubs PII-looking attribute keys on spans and log records."""
    def scrub(attrs):
        if not attrs:
            return
        for key in list(attrs):
            if key in PII_ATTRIBUTE_KEYS and isinstance(attrs[key], str):
                attrs[key] = mask_pii_value(key, attrs[key])

    if span is not None:
        scrub(getattr(span, "_attributes", None))
    if log_record is not None:
        body = log_record.body
        if isinstance(body, str):
            log_record.body = body
    return span, log_record


def setup_otel():
    if not settings.OTEL_ENABLED:
        return
    if os.environ.get("OTEL_SDK_DISABLED", "").lower() in {"true", "1"}:
        return

    from opentelemetry import trace
    from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.django import DjangoInstrumentor
    from opentelemetry.sdk._logs import LoggingHandler, LoggerProvider, set_logger_provider
    from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, OTLPLogExporter
    from opentelemetry.sdk.resources import Resource
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor

    resource = Resource.create(
        {
            "service.name": os.environ.get("OTEL_SERVICE_NAME", "noti-backend"),
            "service.version": "1.0.0",
            "deployment.environment": settings.DJANGO_ENV,
        }
    )

    provider = TracerProvider(resource=resource)
    exporter_protocol = os.environ.get("OTEL_EXPORTER_OTLP_PROTOCOL", "grpc")
    if exporter_protocol == "http/protobuf":
        from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
            OTLPSpanExporter as HTTPSpanExporter,
        )
        exporter = HTTPSpanExporter()
        log_exporter = OTLPLogExporter()  # http exporter shares endpoint env
    else:
        exporter = OTLPSpanExporter()
        log_exporter = OTLPLogExporter()
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    logger_provider = LoggerProvider(resource=resource)
    logger_provider.add_log_record_processor(BatchLogRecordProcessor(log_exporter))
    set_logger_provider(logger_provider)

    handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
    logging.getLogger().addHandler(handler)

    DjangoInstrumentor().instrument()

    try:
        from opentelemetry.instrumentation.celery import CeleryInstrumentor

        CeleryInstrumentor().instrument()
    except Exception:
        logging.getLogger(__name__).warning("celery OTel instrumentation skipped")
