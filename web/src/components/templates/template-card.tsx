import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DotsThreeIcon,
  PencilSimpleIcon,
  TrashIcon,
  FileTextIcon,
  DeviceMobileIcon,
  BellIcon,
} from "@phosphor-icons/react";
import type { Template, TemplateChannel } from "@/hooks/use-templates";

interface TemplateCardProps {
  template: Template;
  wsSlug: string;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
  index?: number;
}

const channelConfig: Record<TemplateChannel, { label: string; icon: typeof FileTextIcon; color: string }> = {
  push: {
    label: "Push",
    icon: BellIcon,
    color: "text-amber-600",
  },
  sms: {
    label: "SMS",
    icon: DeviceMobileIcon,
    color: "text-emerald-600",
  },
  "*": {
    label: "Any",
    icon: FileTextIcon,
    color: "text-violet-600",
  },
};

// Get a preview of the template content
function getContentPreview(template: Template): string {
  if (template.channel === "sms" || template.channel === "*") {
    return template.content.body || "No content";
  }
  return template.content.title || template.content.body || "No content";
}

export function TemplateCard({
  template,
  wsSlug,
  onEdit,
  onDelete,
  index = 0,
}: TemplateCardProps) {
  const channel = channelConfig[template.channel];
  const ChannelIcon = channel.icon;
  const contentPreview = getContentPreview(template);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.04,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <Link to={`/${wsSlug}/templates/${template.id}`} className="block group">
        <motion.article
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <ChannelIcon className={`h-5 w-5 ${channel.color} mt-0.5`} weight="fill" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {template.name}
                </h3>
                <span className="text-xs text-muted-foreground shrink-0">
                  {template.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {contentPreview}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.preventDefault()}
                >
                  <DotsThreeIcon className="h-5 w-5" weight="bold" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(template);
                  }}
                >
                  <PencilSimpleIcon className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(template);
                  }}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
}
