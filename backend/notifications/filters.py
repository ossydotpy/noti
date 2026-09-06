import django_filters

from notifications.models import InAppNotification, Subscriber


class SubscriberFilter(django_filters.FilterSet):
    external_id = django_filters.CharFilter(field_name="external_id", lookup_expr="iexact")
    email = django_filters.CharFilter(field_name="email", lookup_expr="iexact")
    phone_number = django_filters.CharFilter(field_name="phone_number", lookup_expr="iexact")

    class Meta:
        model = Subscriber
        fields = ["external_id", "email", "phone_number"]


class InAppNotificationFilter(django_filters.FilterSet):
    read = django_filters.BooleanFilter(method="filter_read")

    def filter_read(self, queryset, name, value):
        if value is True:
            return queryset.filter(read_at__isnull=False)
        if value is False:
            return queryset.filter(read_at__isnull=True)
        return queryset

    class Meta:
        model = InAppNotification
        fields = ["read"]
