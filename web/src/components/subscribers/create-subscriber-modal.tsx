
import { useState } from "react";
import { motion, type Variants } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateSubscriberInput } from "@/hooks/use-subscribers";
import { SpinnerIcon } from "@phosphor-icons/react";
import { GlassInputWrapper } from "@/components/ui/glass-input";

interface CreateSubscriberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateSubscriberInput) => void;
  isPending: boolean;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
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

export function CreateSubscriberModal({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateSubscriberModalProps) {
  const [formData, setFormData] = useState<CreateSubscriberInput>({
    external_id: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    timezone: "",
    locale: "",
    data: undefined,
  });

  const [activeTab, setActiveTab] = useState("basic");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitData: CreateSubscriberInput = {
      external_id: formData.external_id,
    };
    
    if (formData.first_name) submitData.first_name = formData.first_name;
    if (formData.last_name) submitData.last_name = formData.last_name;
    if (formData.email) submitData.email = formData.email;
    if (formData.phone_number) submitData.phone_number = formData.phone_number;
    if (formData.timezone) submitData.timezone = formData.timezone;
    if (formData.locale) submitData.locale = formData.locale;
    
    onSubmit(submitData);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setFormData({
        external_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone_number: "",
        timezone: "",
        locale: "",
        data: undefined,
      });
      setActiveTab("basic");
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[520px] p-0 gap-0 overflow-hidden rounded-3xl border border-border bg-background shadow-2xl">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="px-8 pt-8 pb-6 border-b border-border/50">
            <DialogHeader className="space-y-3">
              <DialogTitle className="text-2xl font-bold tracking-tight">
                Create Subscriber
              </DialogTitle>
              <p className="text-muted-foreground">
                Add a new subscriber to your workspace
              </p>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-xl bg-muted p-1">
                <TabsTrigger 
                  value="basic" 
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Basic Info
                </TabsTrigger>
                <TabsTrigger 
                  value="advanced"
                  className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Advanced
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-5 mt-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-5"
                >
                  <motion.div variants={itemVariants} className="space-y-3">
                    <Label htmlFor="external_id" className="text-sm font-medium">
                      External ID <span className="text-destructive">*</span>
                    </Label>
                    <GlassInputWrapper>
                      <input
                        id="external_id"
                        placeholder="e.g., user-12345"
                        value={formData.external_id}
                        onChange={(e) =>
                          setFormData({ ...formData, external_id: e.target.value })
                        }
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                        required
                      />
                    </GlassInputWrapper>
                    <p className="text-xs text-muted-foreground">
                      Unique identifier for this subscriber in your system
                    </p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label htmlFor="first_name" className="text-sm font-medium">
                        First Name
                      </Label>
                      <GlassInputWrapper>
                        <input
                          id="first_name"
                          placeholder="John"
                          value={formData.first_name}
                          onChange={(e) =>
                            setFormData({ ...formData, first_name: e.target.value })
                          }
                          className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                        />
                      </GlassInputWrapper>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="last_name" className="text-sm font-medium">
                        Last Name
                      </Label>
                      <GlassInputWrapper>
                        <input
                          id="last_name"
                          placeholder="Doe"
                          value={formData.last_name}
                          onChange={(e) =>
                            setFormData({ ...formData, last_name: e.target.value })
                          }
                          className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                        />
                      </GlassInputWrapper>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email
                    </Label>
                    <GlassInputWrapper>
                      <input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                      />
                    </GlassInputWrapper>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-3">
                    <Label htmlFor="phone" className="text-sm font-medium">
                      Phone Number
                    </Label>
                    <GlassInputWrapper>
                      <input
                        id="phone"
                        placeholder="+1 555 123 4567"
                        value={formData.phone_number}
                        onChange={(e) =>
                          setFormData({ ...formData, phone_number: e.target.value })
                        }
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                      />
                    </GlassInputWrapper>
                  </motion.div>
                </motion.div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-5 mt-6">
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-5"
                >
                  <motion.div variants={itemVariants} className="space-y-3">
                    <Label htmlFor="timezone" className="text-sm font-medium">
                      Timezone
                    </Label>
                    <GlassInputWrapper>
                      <input
                        id="timezone"
                        placeholder="e.g., America/New_York"
                        value={formData.timezone}
                        onChange={(e) =>
                          setFormData({ ...formData, timezone: e.target.value })
                        }
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                      />
                    </GlassInputWrapper>
                    <p className="text-xs text-muted-foreground">
                      IANA timezone format (e.g., America/New_York, Europe/London)
                    </p>
                  </motion.div>

                  <motion.div variants={itemVariants} className="space-y-3">
                    <Label htmlFor="locale" className="text-sm font-medium">
                      Locale
                    </Label>
                    <GlassInputWrapper>
                      <input
                        id="locale"
                        placeholder="e.g., en-US"
                        value={formData.locale}
                        onChange={(e) =>
                          setFormData({ ...formData, locale: e.target.value })
                        }
                        className="w-full bg-transparent text-sm p-4 rounded-2xl focus:outline-none placeholder:text-muted-foreground/50"
                      />
                    </GlassInputWrapper>
                    <p className="text-xs text-muted-foreground">
                      Language locale (e.g., en-US, fr-FR, es-ES)
                    </p>
                  </motion.div>
                </motion.div>
              </TabsContent>
            </Tabs>

            <motion.div variants={itemVariants}>
              <div className="flex justify-end gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClose}
                  disabled={isPending}
                  className="h-12 rounded-2xl px-6"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isPending || !formData.external_id}
                  className="h-12 rounded-2xl px-6 min-w-[140px] shadow-lg shadow-primary/20"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <SpinnerIcon className="h-4 w-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Subscriber"
                  )}
                </Button>
              </div>
            </motion.div>
          </form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
