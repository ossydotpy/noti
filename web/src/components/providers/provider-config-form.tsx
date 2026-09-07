import { useState, useCallback, useMemo } from "react";
import { useNavigate, useRouter, useParams } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { motion, type Variants } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  FloppyDiskIcon,
  FlaskIcon,
  Spinner,
  CheckCircleIcon,
  WarningIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import { Switch } from "@/components/ui/switch";
import { InfoCard, InfoCardHeader, InfoCardContent } from "@/components/ui/info-card";
import { providerKeys } from "@/lib/api/provider-keys";
import { getApiErrorMessage } from "@/hooks/use-workspaces";
import { api, ApiError } from "@/lib/auth/authFetch";
import { cn } from "@/lib/utils";
import { getProviderMeta, CHANNEL_META } from "@/lib/provider-meta";
import { type Provider, type ProviderType } from "@/hooks/use-providers";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

interface ProviderConfigFormProps {
  type: ProviderType;
  initialData?: Provider;
  isNew?: boolean;
}

interface FieldError {
  [key: string]: string;
}

function isSensitiveField(key: string): boolean {
  const sensitivePatterns = ["key", "secret", "token", "password", "private", "auth"];
  return sensitivePatterns.some((p) => key.toLowerCase().includes(p));
}

function humanizeFieldName(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

function getErrorMessage(err: unknown): string {
  if (err instanceof ApiError && err.status >= 500) {
    return "Server error, try again later";
  }
  if (err instanceof Error && !(err instanceof ApiError)) {
    return err.message;
  }
  return getApiErrorMessage(err, "An error occurred");
}

function validateConfig(
  config: Record<string, unknown>,
  schema: Record<string, unknown>
): FieldError {
  const errors: FieldError = {};
  const properties = (schema?.properties as Record<string, any>) || {};
  const required = (schema?.required as string[]) || [];

  for (const key of required) {
    const value = config[key];
    if (value === undefined || value === null || value === "") {
      const fieldSchema = properties[key];
      const label = fieldSchema?.title || humanizeFieldName(key);
      errors[key] = `${label} is required`;
    }
  }

  for (const [key, fieldSchema] of Object.entries(properties)) {
    const value = config[key];
    if (value === undefined || value === null || value === "") continue;

    if (fieldSchema.maxLength && typeof value === "string" && value.length > fieldSchema.maxLength) {
      errors[key] = `Must be at most ${fieldSchema.maxLength} characters`;
    }
    if (fieldSchema.minLength && typeof value === "string" && value.length < fieldSchema.minLength) {
      errors[key] = `Must be at least ${fieldSchema.minLength} characters`;
    }
  }

  return errors;
}

export function ProviderConfigForm({ type, initialData, isNew }: ProviderConfigFormProps) {
  const navigate = useNavigate();
  const router = useRouter();
  const params = useParams({ strict: false }) as { wsSlug: string };
  const { activeWorkspaceId } = useWorkspaces();
  const queryClient = useQueryClient();

  const meta = getProviderMeta(type.key);
  const channelMeta = CHANNEL_META[type.channel];

  const [formData, setFormData] = useState({
    name: initialData?.name || type.name,
    priority: initialData?.priority ?? 1,
    is_active: initialData?.is_active ?? true,
    config: (initialData?.config || {}) as Record<string, unknown>,
  });

  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: "success" | "error";
    message: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revealedFields, setRevealedFields] = useState<Set<string>>(new Set());

  const toggleReveal = useCallback((key: string) => {
    setRevealedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const fields = useMemo(() => {
    const properties = (type.schema?.properties as Record<string, any>) || {};
    const required = (type.schema?.required as string[]) || [];
    return Object.entries(properties).map(([key, schema]) => ({
      key,
      schema,
      label: schema.title || humanizeFieldName(key),
      description: schema.description || "",
      isRequired: required.includes(key),
      isBoolean: schema.type === "boolean",
      isSensitive: !schema.type || schema.type !== "boolean" ? isSensitiveField(key) : false,
    }));
  }, [type.schema]);

  const validate = useCallback(() => {
    const errors = validateConfig(formData.config, type.schema);
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData.config, type.schema]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    setError(null);

    try {
      const workspaceHeaders = { "X-Workspace-ID": activeWorkspaceId as string };

      const payload = {
        ...formData,
        provider_type: type.key,
        channel: type.channel,
      };

      if (isNew) {
        await api.post("/v1/dashboard/providers/", payload, {
          headers: workspaceHeaders,
        });
      } else {
        await api.patch(
          `/v1/dashboard/providers/${initialData?.id}/`,
          payload,
          { headers: workspaceHeaders }
        );
      }

      await queryClient.invalidateQueries({
        queryKey: providerKeys.list(activeWorkspaceId || undefined),
      });
      toast.success(isNew ? "Provider created" : "Provider updated");
      navigate({ to: `/${params.wsSlug}/providers` });
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validate()) return;

    setIsTesting(true);
    setTestResult(null);
    setError(null);

    try {
      const workspaceHeaders = { "X-Workspace-ID": activeWorkspaceId as string };

      const data = isNew
        ? await api.post<{ status: string; message: string }>(
            "/v1/dashboard/providers/validate/",
            {
              provider_type: type.key,
              config: formData.config,
            },
            { headers: workspaceHeaders }
          )
        : await api.post<{ status: string; message: string }>(
            `/v1/dashboard/providers/${initialData?.id}/test_connection/`,
            undefined,
            { headers: workspaceHeaders }
          );

      if (data.status === "success") {
        setTestResult({ status: "success", message: data.message });
        toast.success("Connection test passed", {
          description: data.message,
        });
      } else {
        const msg = data.message || "Connection test failed";
        setTestResult({
          status: "error",
          message: msg,
        });
        toast.error("Connection test failed", {
          description: msg,
        });
      }
    } catch (err: any) {
      const msg = getErrorMessage(err);
      setTestResult({
        status: "error",
        message: msg,
      });
      toast.error("Connection test failed", {
        description: msg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const updateConfig = useCallback(
    (key: string, value: unknown) => {
      setFormData((prev) => ({
        ...prev,
        config: { ...prev.config, [key]: value },
      }));
      if (fieldErrors[key]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
      }
    },
    [fieldErrors]
  );

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col lg:flex-row gap-8 lg:gap-12">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 max-w-3xl space-y-8 pb-20"
      >
        <motion.button
          variants={itemVariants}
          onClick={() => router.history.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to providers</span>
        </motion.button>

        <motion.header variants={itemVariants} className="flex items-start gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {isNew ? `Set up ${type.name}` : formData.name}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <span className={cn("w-1.5 h-1.5 rounded-full", channelMeta.dotColor)} />
                {channelMeta.label}
              </span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {isNew
                ? meta.description
                : `Manage credentials and routing priority for this ${channelMeta.label.toLowerCase()} provider.`}
            </p>
          </div>
        </motion.header>

        <motion.form variants={itemVariants} onSubmit={handleSubmit} className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <label className="text-sm font-medium">Status</label>
              <p className="text-sm text-muted-foreground">
                {formData.is_active
                  ? "This provider is active and will receive notifications."
                  : "This provider is paused and will not be used."}
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_active: checked }))
              }
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-baseline justify-between">
              <label className="text-sm font-medium">Routing Priority</label>
              <span className="text-xs text-muted-foreground">
                Higher priority providers are tried first
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: 1, label: "Primary", description: "First choice" },
                { value: 2, label: "Secondary", description: "Fallback" },
                { value: 3, label: "Tertiary", description: "Backup" },
                { value: 10, label: "Low", description: "Last resort" },
              ].map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, priority: preset.value }))}
                  className={cn(
                    "flex flex-col items-start px-4 py-3 rounded-xl border transition-all duration-200",
                    formData.priority === preset.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <span className="text-sm font-medium">{preset.label}</span>
                  <span className="text-xs text-muted-foreground">
                    Priority {preset.value} · {preset.description}
                  </span>
                </button>
              ))}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    const custom = formData.priority > 10 ? formData.priority : 11;
                    setFormData((prev) => ({ ...prev, priority: custom }));
                  }}
                  className={cn(
                    "flex flex-col items-start px-4 py-3 rounded-xl border transition-all duration-200 min-w-[100px]",
                    formData.priority > 10
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <span className="text-sm font-medium">Custom</span>
                  <span className="text-xs text-muted-foreground">
                    Priority {formData.priority > 10 ? formData.priority : "11+"}
                  </span>
                </button>
                {formData.priority > 10 && (
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full pt-2 z-10">
                    <GlassInputWrapper className="shadow-lg">
                      <input
                        type="number"
                        min="0"
                        value={formData.priority}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            priority: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="w-20 bg-transparent text-sm p-2 rounded-2xl focus:outline-none text-center"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </GlassInputWrapper>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold tracking-tight">Credentials</h2>
              <p className="text-sm text-muted-foreground">
                API keys and configuration required to connect to {type.name}.
              </p>
            </div>

            <div className="space-y-6">
              {fields.map((field) => (
                <div key={field.key} className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <label
                        htmlFor={`field-${field.key}`}
                        className="text-sm font-medium"
                      >
                        {field.label}
                      </label>
                      {field.isRequired && (
                        <span className="text-destructive text-xs">*</span>
                      )}
                    </div>
                    {field.description && (
                      <p className="text-xs text-muted-foreground">
                        {field.description}
                      </p>
                    )}
                  </div>

                  {field.isBoolean ? (
                    <Switch
                      checked={!!formData.config[field.key]}
                      onCheckedChange={(checked) => updateConfig(field.key, checked)}
                    />
                  ) : (
                    <GlassInputWrapper>
                      <div className="relative">
                        <input
                          id={`field-${field.key}`}
                          type={
                            field.isSensitive && !revealedFields.has(field.key)
                              ? "password"
                              : "text"
                          }
                          placeholder={field.description || `Enter ${field.label.toLowerCase()}`}
                          value={(formData.config[field.key] as string) || ""}
                          onChange={(e) => updateConfig(field.key, e.target.value)}
                          aria-invalid={!!fieldErrors[field.key]}
                          className={cn(
                            "w-full bg-transparent text-sm p-4 pr-12 rounded-2xl focus:outline-none",
                            fieldErrors[field.key] && "text-destructive placeholder:text-destructive/50"
                          )}
                        />
                        {field.isSensitive && (
                          <button
                            type="button"
                            onClick={() => toggleReveal(field.key)}
                            className="absolute inset-y-0 right-3 flex items-center p-2 text-muted-foreground hover:text-foreground transition-colors"
                            tabIndex={-1}
                          >
                            {revealedFields.has(field.key) ? (
                              <EyeSlashIcon className="w-5 h-5" />
                            ) : (
                              <EyeIcon className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </GlassInputWrapper>
                  )}

                  {fieldErrors[field.key] && (
                    <p className="text-sm text-destructive flex items-center gap-1.5">
                      <WarningIcon className="w-4 h-4 shrink-0" />
                      {fieldErrors[field.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {(testResult || error) && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-4",
                testResult?.status === "success"
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                  : "bg-destructive/5 border-destructive/20 text-destructive"
              )}
            >
              {testResult?.status === "success" ? (
                <CheckCircleIcon className="w-5 h-5 mt-0.5 shrink-0" />
              ) : (
                <WarningIcon className="w-5 h-5 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1 min-w-0">
                <p className="text-sm font-medium">
                  {testResult
                    ? testResult.status === "success"
                      ? "Connection successful"
                      : "Connection failed"
                    : "Error saving provider"}
                </p>
                <p className="text-sm opacity-80 leading-relaxed wrap-break-word">
                  {testResult?.message || error}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="h-14 rounded-2xl gap-2 font-semibold"
            >
              {isTesting ? (
                <Spinner className="w-5 h-5 animate-spin" />
              ) : (
                <FlaskIcon className="w-5 h-5" />
              )}
              Test Connection
            </Button>

            <Button
              type="submit"
              disabled={isSaving || isTesting}
              className="h-14 rounded-2xl gap-2 font-semibold shadow-lg shadow-primary/20"
            >
              {isSaving ? (
                <Spinner className="w-5 h-5 animate-spin" />
              ) : (
                <FloppyDiskIcon className="w-5 h-5" />
              )}
              {isNew ? "Connect Provider" : "Save Changes"}
            </Button>
          </div>
        </motion.form>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="hidden lg:block w-80 xl:w-96 shrink-0"
      >
        <div className="sticky top-24 space-y-6">
          <InfoCard>
            <InfoCardHeader>Documentation</InfoCardHeader>
            <InfoCardContent className="text-muted-foreground mb-4">
              Learn more about configuring {type.name} and best practices for {channelMeta.label.toLowerCase()} delivery.
            </InfoCardContent>
            <Button 
              variant="outline" 
              className="w-full rounded-xl" 
              asChild
              disabled={!type.docs_url}
            >
              <a 
                href={type.docs_url || "#"} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {type.docs_url ? "View Documentation" : "Documentation unavailable"}
              </a>
            </Button>
          </InfoCard>

          <InfoCard variant="success">
            <InfoCardHeader>Security</InfoCardHeader>
            <InfoCardContent className="text-muted-foreground">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Credentials are encrypted at rest</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Never share API keys in code</span>
                </li>
              </ul>
            </InfoCardContent>
          </InfoCard>

          <InfoCard variant="warning">
            <InfoCardHeader>Quick Tips</InfoCardHeader>
            <InfoCardContent className="text-muted-foreground">
              <ul className="space-y-2.5">
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-semibold mt-0.5">1.</span>
                  <span>Test your connection before saving</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-semibold mt-0.5">2.</span>
                  <span>Use priority to control fallback order</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-500 font-semibold mt-0.5">3.</span>
                  <span>Disable providers instead of deleting</span>
                </li>
              </ul>
            </InfoCardContent>
          </InfoCard>
        </div>
      </motion.div>
    </div>
  );
}
