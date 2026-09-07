import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import { PhoneFrame, NotificationPreview, SMSPreview } from "./phone-preview";
import { ArrowsClockwiseIcon, UserIcon } from "@phosphor-icons/react";
import type { TemplateContent, TemplateChannel } from "@/hooks/use-templates";

interface VariablePreviewProps {
  content: TemplateContent;
  channel: TemplateChannel;
  variables: Record<string, unknown>;
}

// Default subscriber data for preview
const DEFAULT_SUBSCRIBER = {
  "subscriber.external_id": "user_12345",
  "subscriber.first_name": "John",
  "subscriber.last_name": "Doe",
  "subscriber.email": "john.doe@example.com",
};

// Extract all variables including nested ones (e.g., subscriber.first_name)
function extractVariables(content: TemplateContent): string[] {
  const variables = new Set<string>();
  const pattern = /\{\{([\w.]+)\}\}/g;

  const checkText = (text: string) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      variables.add(match[1]);
    }
  };

  // Check title
  if (content.title) {
    checkText(content.title);
  }

  // Check body
  if (content.body) {
    checkText(content.body);
  }

  // Check data_payload
  if (content.data_payload) {
    Object.values(content.data_payload).forEach((value) => {
      if (typeof value === "string") {
        checkText(value);
      }
    });
  }

  return Array.from(variables);
}

// Render template with variable substitution
function renderTemplate(
  content: TemplateContent,
  values: Record<string, string>
): TemplateContent {
  const substitute = (text: string): string => {
    return text.replace(/\{\{([\w.]+)\}\}/g, (match, varName) => {
      const value = values[varName];
      return value !== undefined ? String(value) : match;
    });
  };

  return {
    ...content,
    title: content.title ? substitute(content.title) : undefined,
    body: substitute(content.body),
    data_payload: content.data_payload
      ? Object.entries(content.data_payload).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: typeof value === "string" ? substitute(value) : value,
          }),
          {}
        )
      : undefined,
  };
}

// Check if variable is a subscriber variable
function isSubscriberVariable(varName: string): boolean {
  return varName.startsWith("subscriber.");
}

export function VariablePreview({
  content,
  channel,
  variables,
}: VariablePreviewProps) {
  const extractedVars = useMemo(() => extractVariables(content), [content]);
  
  // Separate subscriber and custom variables
  const subscriberVars = extractedVars.filter(isSubscriberVariable);
  const customVars = extractedVars.filter(v => !isSubscriberVariable(v));

  // Initialize sample values with defaults
  const [sampleValues, setSampleValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = { ...DEFAULT_SUBSCRIBER };
    customVars.forEach((varName) => {
      const type = variables[varName];
      initial[varName] = type === "number" ? "42" : type === "boolean" ? "true" : "Sample value";
    });
    return initial;
  });

  const renderedContent = useMemo(() => {
    return renderTemplate(content, sampleValues);
  }, [content, sampleValues]);

  const handleValueChange = (varName: string, value: string) => {
    setSampleValues((prev) => ({
      ...prev,
      [varName]: value,
    }));
  };

  const handleReset = () => {
    const reset: Record<string, string> = { ...DEFAULT_SUBSCRIBER };
    customVars.forEach((varName) => {
      const type = variables[varName];
      reset[varName] = type === "number" ? "42" : type === "boolean" ? "true" : "Sample value";
    });
    setSampleValues(reset);
  };

  const isPush = channel === "push";
  const isSMS = channel === "sms";
  const hasVariables = extractedVars.length > 0;

  return (
    <div className="space-y-6">
      {/* Variable Inputs */}
      {hasVariables && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">
              Test Variables
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs rounded-lg"
              onClick={handleReset}
            >
              <ArrowsClockwiseIcon className="h-3 w-3 mr-1" />
              Reset
            </Button>
          </div>

          {/* Subscriber Variables */}
          {subscriberVars.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserIcon className="h-3 w-3 text-blue-500" />
                <span className="text-xs font-medium text-muted-foreground">Subscriber Data</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {subscriberVars.map((varName) => (
                  <div key={varName} className="space-y-1.5">
                    <Label className="text-xs">
                      <code className="font-mono text-blue-600">{varName}</code>
                    </Label>
                    <GlassInputWrapper>
                      <input
                        value={sampleValues[varName] || ""}
                        onChange={(e) => handleValueChange(varName, e.target.value)}
                        placeholder="Enter test value..."
                        className="w-full bg-transparent text-sm px-3 py-2 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                      />
                    </GlassInputWrapper>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Variables */}
          {customVars.length > 0 && (
            <div className="space-y-3">
              <span className="text-xs font-medium text-muted-foreground">Custom Variables</span>
              <div className="grid grid-cols-2 gap-3">
                {customVars.map((varName) => (
                  <div key={varName} className="space-y-1.5">
                    <Label className="text-xs">
                      <code className="font-mono text-primary">{varName}</code>
                      {varName in variables && (
                        <span className="text-muted-foreground ml-1">
                          ({String(variables[varName])})
                        </span>
                      )}
                    </Label>
                    <GlassInputWrapper>
                      <input
                        value={sampleValues[varName] || ""}
                        onChange={(e) => handleValueChange(varName, e.target.value)}
                        placeholder="Enter test value..."
                        className="w-full bg-transparent text-sm px-3 py-2 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                      />
                    </GlassInputWrapper>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Device Preview */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">Device Preview</h4>
        </div>

        {isPush ? (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="preview" className="rounded-lg">Device</TabsTrigger>
              <TabsTrigger value="raw" className="rounded-lg">Raw</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <PhoneFrame 
                background="bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100"
                className="scale-90 sm:scale-100 origin-top"
              >
                {/* Lock Screen Time */}
                <div className="text-center mt-2 mb-6">
                  <h1 className="text-5xl font-light text-gray-800 tracking-tighter">9:41</h1>
                  <p className="text-xs font-medium text-gray-500 mt-1">Wednesday, October 18</p>
                </div>

                {/* Notification */}
                <NotificationPreview 
                  title={renderedContent.title}
                  body={renderedContent.body}
                  imageUrl={renderedContent.image_url}
                />
              </PhoneFrame>
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <div className="rounded-2xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-4 space-y-3">
                {renderedContent.title && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Title</span>
                    <p className="text-sm mt-1">{renderedContent.title}</p>
                  </div>
                )}
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Body</span>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{renderedContent.body}</p>
                </div>
                {renderedContent.image_url && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Image URL</span>
                    <code className="text-xs block mt-1 bg-muted px-2 py-1 rounded">{renderedContent.image_url}</code>
                  </div>
                )}
                {renderedContent.data_payload && Object.keys(renderedContent.data_payload).length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground">Data Payload</span>
                    <pre className="text-xs bg-muted rounded-xl p-3 mt-1 overflow-x-auto">
                      {JSON.stringify(renderedContent.data_payload, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        ) : isSMS ? (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="preview" className="rounded-lg">Device</TabsTrigger>
              <TabsTrigger value="raw" className="rounded-lg">Raw</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <PhoneFrame 
                background="bg-white"
                className="scale-90 sm:scale-100 origin-top"
              >
                <SMSPreview body={renderedContent.body} />
              </PhoneFrame>
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <div className="rounded-2xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-4">
                <span className="text-xs font-medium text-muted-foreground">Body</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{renderedContent.body}</p>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs defaultValue="preview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl">
              <TabsTrigger value="preview" className="rounded-lg">Preview</TabsTrigger>
              <TabsTrigger value="raw" className="rounded-lg">Raw</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="mt-4">
              <div className="rounded-2xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {renderedContent.body}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <div className="rounded-2xl border border-border bg-linear-to-br from-background via-background to-muted/20 p-4">
                <span className="text-xs font-medium text-muted-foreground">Body</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{renderedContent.body}</p>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
