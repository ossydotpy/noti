import { useState } from "react";
import { motion, type Variants } from "motion/react";
import { Subscriber, useUpdateSubscriber } from "@/hooks/use-subscribers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GlassInputWrapper } from "@/components/ui/glass-input";
import { InfoCard, InfoCardHeader, InfoCardContent } from "@/components/ui/info-card";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface SubscriberOverviewProps {
  subscriber: Subscriber;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 25 },
  },
};

function InfoRow({ 
  label, 
  value, 
  placeholder = "Not set" 
}: { 
  label: string; 
  value: string | null | undefined; 
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
      <p className={cn("text-base", !value && "text-muted-foreground/60 italic")}>
        {value || placeholder}
      </p>
    </div>
  );
}

export function SubscriberOverview({
  subscriber,
  isEditing,
  setIsEditing,
}: SubscriberOverviewProps) {
  const updateSubscriber = useUpdateSubscriber(subscriber.id);
  const [formData, setFormData] = useState({
    first_name: subscriber.first_name || "",
    last_name: subscriber.last_name || "",
    email: subscriber.email || "",
    phone_number: subscriber.phone_number || "",
    timezone: subscriber.timezone || "",
    locale: subscriber.locale || "",
  });

  const handleSave = async () => {
    try {
      await updateSubscriber.mutateAsync(formData);
      toast.success("Subscriber updated successfully");
      setIsEditing(false);
    } catch {
      toast.error("Failed to update subscriber");
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: subscriber.first_name || "",
      last_name: subscriber.last_name || "",
      email: subscriber.email || "",
      phone_number: subscriber.phone_number || "",
      timezone: subscriber.timezone || "",
      locale: subscriber.locale || "",
    });
    setIsEditing(false);
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-6 lg:grid-cols-3"
    >
      <InfoCard className="lg:col-span-2">
        <div className="flex items-center justify-between mb-6">
          <InfoCardHeader>Contact Information</InfoCardHeader>
          {!isEditing ? (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="rounded-xl h-9 px-4"
            >
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancel}
                className="rounded-xl h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={updateSubscriber.isPending}
                className="rounded-xl h-9 px-4 shadow-sm"
              >
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {!isEditing ? (
            <motion.div variants={itemVariants} className="grid gap-6 sm:grid-cols-2">
              <InfoRow label="First Name" value={subscriber.first_name} />
              <InfoRow label="Last Name" value={subscriber.last_name} />
              <InfoRow label="Email" value={subscriber.email} />
              <InfoRow label="Phone" value={subscriber.phone_number} />
              <InfoRow label="Timezone" value={subscriber.timezone} />
              <InfoRow label="Locale" value={subscriber.locale} />
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="first_name" className="text-sm font-medium">First Name</Label>
                <GlassInputWrapper>
                  <input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-3">
                <Label htmlFor="last_name" className="text-sm font-medium">Last Name</Label>
                <GlassInputWrapper>
                  <input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <GlassInputWrapper>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                <GlassInputWrapper>
                  <input
                    id="phone"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-3">
                <Label htmlFor="timezone" className="text-sm font-medium">Timezone</Label>
                <GlassInputWrapper>
                  <input
                    id="timezone"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    placeholder="e.g., America/New_York"
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  />
                </GlassInputWrapper>
              </div>

              <div className="space-y-3">
                <Label htmlFor="locale" className="text-sm font-medium">Locale</Label>
                <GlassInputWrapper>
                  <input
                    id="locale"
                    value={formData.locale}
                    onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                    placeholder="e.g., en-US"
                    className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                  />
                </GlassInputWrapper>
              </div>
            </motion.div>
          )}
        </div>
      </InfoCard>

      <InfoCard>
        <InfoCardHeader>Metadata</InfoCardHeader>
        <InfoCardContent>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Subscriber ID
              </Label>
              <code className="block text-sm font-mono bg-muted/50 px-3 py-2 rounded-xl">
                {subscriber.id}
              </code>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                External ID
              </Label>
              <code className="block text-sm font-mono bg-muted/50 px-3 py-2 rounded-xl">
                {subscriber.external_id}
              </code>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Created
              </Label>
              <p className="text-sm">
                {format(new Date(subscriber.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Updated
              </Label>
              <p className="text-sm">
                {format(new Date(subscriber.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
            {subscriber.data && Object.keys(subscriber.data).length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Custom Data
                </Label>
                <pre className="text-xs bg-muted/50 p-3 rounded-xl overflow-auto max-h-40">
                  {JSON.stringify(subscriber.data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </InfoCardContent>
      </InfoCard>
    </motion.div>
  );
}
