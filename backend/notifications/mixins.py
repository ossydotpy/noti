class WorkspaceScopedMixin:
    """Filters the queryset by the workspace set by APIKeyMiddleware.

    The model is taken from the active serializer class; the model must have
    a ``workspace`` ForeignKey.
    """

    def get_queryset(self):
        serializer_class = self.get_serializer_class()
        if serializer_class is None:
            raise AttributeError(
                f"{self.__class__.__name__} must define serializer_class or "
                f"override get_serializer_class()"
            )

        model_class = serializer_class.Meta.model
        workspace = getattr(self.request, "workspace", None)
        if workspace is None:
            return model_class.objects.none()
        return model_class.objects.filter(workspace=workspace)
