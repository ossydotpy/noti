
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon, X, Bell, DeviceMobile, FileText } from "@phosphor-icons/react";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TemplateChannel, TemplateContent } from "@/hooks/use-templates";

interface TemplateContentEditorProps {
  channel: TemplateChannel;
  content: TemplateContent;
  onChange: (content: TemplateContent) => void;
  variables: Record<string, unknown>;
  onVariablesChange: (variables: Record<string, unknown>) => void;
}

const channelOptions: { value: TemplateChannel; label: string; icon: typeof Bell }[] = [
  { value: "push", label: "Push Notification", icon: Bell },
  { value: "sms", label: "SMS", icon: DeviceMobile },
  { value: "*", label: "Any Channel", icon: FileText },
];

export function TemplateContentEditor({
  channel,
  content,
  onChange,
  variables,
  onVariablesChange,
}: TemplateContentEditorProps) {
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<"string" | "number" | "boolean">("string");

  // Auto-update content structure when channel changes
  useEffect(() => {
    if (channel === "sms" || channel === "*") {
      // Remove push-specific fields for SMS/Any
      const { title, image_url, data_payload, ...rest } = content;
      onChange({
        ...rest,
        body: rest.body || "",
      });
    }
  }, [channel]);

  const handleAddVariable = () => {
    if (!newVarName.trim()) return;
    
    onVariablesChange({
      ...variables,
      [newVarName.trim()]: newVarType,
    });
    setNewVarName("");
  };

  const handleRemoveVariable = (key: string) => {
    const { [key]: _, ...rest } = variables;
    onVariablesChange(rest);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddVariable();
    }
  };

  const isPush = channel === "push";
  const isSMS = channel === "sms" || channel === "*";

  return (
    <div className="space-y-5">
      {/* Content Fields */}
      <div className="space-y-4">
        {isPush && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Title</Label>
            <GlassInputWrapper>
              <input
                placeholder="Notification title..."
                value={content.title || ""}
                onChange={(e) => onChange({ ...content, title: e.target.value })}
                className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
              />
            </GlassInputWrapper>
            <p className="text-xs text-muted-foreground">
              Use {"{{variable_name}}"} for dynamic values
            </p>
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Body <span className="text-destructive">*</span>
          </Label>
          <GlassInputWrapper>
            <textarea
              placeholder="Enter message content..."
              value={content.body || ""}
              onChange={(e) => onChange({ ...content, body: e.target.value })}
              rows={4}
              className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50 resize-none"
              required
            />
          </GlassInputWrapper>
          <p className="text-xs text-muted-foreground">
            Use {"{{variable_name}}"} for dynamic values
          </p>
        </div>

        {isPush && (
          <>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Image URL (Optional)</Label>
              <GlassInputWrapper>
                <input
                  placeholder="https://example.com/image.png"
                  value={content.image_url || ""}
                  onChange={(e) => onChange({ ...content, image_url: e.target.value })}
                  className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                />
              </GlassInputWrapper>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Data Payload (Optional)</Label>
              <DataPayloadEditor
                data={content.data_payload || {}}
                onChange={(data) => onChange({ ...content, data_payload: data })}
              />
            </div>
          </>
        )}
      </div>

      {/* Variables Section */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h4 className="text-sm font-medium text-muted-foreground">Variables</h4>
        
        {/* Variable List */}
        {Object.keys(variables).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {Object.entries(variables).map(([key, type]) => (
              <Badge
                key={key}
                variant="secondary"
                className="gap-1.5 pr-1.5 text-xs py-1.5"
              >
                <code className="font-mono">{`{{${key}}}`}</code>
                <span className="text-muted-foreground">({type as string})</span>
                <button
                  type="button"
                  onClick={() => handleRemoveVariable(key)}
                  className="ml-1 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Add Variable */}
        <div className="flex gap-2">
          <div className="flex-1">
            <GlassInputWrapper>
              <input
                placeholder="Variable name..."
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent text-sm px-4 py-2.5 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
              />
            </GlassInputWrapper>
          </div>
          <Select value={newVarType} onValueChange={(value) => setNewVarType(value as typeof newVarType)}>
            <SelectTrigger className="w-[110px] rounded-2xl h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="string">String</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="boolean">Boolean</SelectItem>
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-2xl"
            onClick={handleAddVariable}
            disabled={!newVarName.trim()}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Define variables to use in your template with {"{{variable_name}}"} syntax
        </p>
      </div>
    </div>
  );
}

// Data Payload Editor Component
interface DataPayloadEditorProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}

function DataPayloadEditor({ data, onChange }: DataPayloadEditorProps) {
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const handleAdd = () => {
    if (!newKey.trim()) return;
    onChange({
      ...data,
      [newKey.trim()]: newValue,
    });
    setNewKey("");
    setNewValue("");
  };

  const handleRemove = (key: string) => {
    const { [key]: _, ...rest } = data;
    onChange(rest);
  };

  return (
    <div className="space-y-3">
      {Object.entries(data).length > 0 && (
        <div className="space-y-2">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2">
              <code className="text-xs font-mono bg-muted px-3 py-2 rounded-xl flex-1 truncate">
                {key}: {typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : JSON.stringify(value)}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-xl"
                onClick={() => handleRemove(key)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-2">
        <GlassInputWrapper className="flex-1">
          <input
            placeholder="Key"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full bg-transparent text-xs px-3 py-2 rounded-xl focus:outline-none placeholder:text-muted-foreground/50"
          />
        </GlassInputWrapper>
        <GlassInputWrapper className="flex-1">
          <input
            placeholder="Value"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full bg-transparent text-xs px-3 py-2 rounded-xl focus:outline-none placeholder:text-muted-foreground/50"
          />
        </GlassInputWrapper>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8 shrink-0 rounded-xl"
          onClick={handleAdd}
          disabled={!newKey.trim()}
        >
          <PlusIcon className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
