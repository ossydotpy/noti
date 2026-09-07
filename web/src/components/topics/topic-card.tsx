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
  PowerIcon,
  UsersIcon,
  HashIcon,
} from "@phosphor-icons/react";
import type { Topic } from "@/hooks/use-topics";

interface TopicCardProps {
  topic: Topic;
  wsSlug: string;
  onActivate: (topicId: string) => void;
  onDelete: (topic: Topic) => void;
  index?: number;
}

export function TopicCard({
  topic,
  wsSlug,
  onActivate,
  onDelete,
  index = 0,
}: TopicCardProps) {
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
      <Link
        to="/$wsSlug/topics/$topicId"
        params={{ wsSlug, topicId: topic.id }}
        className="block group"
      >
        <motion.article
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="relative bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow duration-200 cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <HashIcon className="h-5 w-5 text-muted-foreground mt-0.5" weight="bold" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors">
                  {topic.name}
                </h3>
                <span className="text-xs text-muted-foreground shrink-0">
                  {topic.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex items-center gap-3 mt-1">
                <code className="text-xs text-muted-foreground font-mono">
                  {topic.slug}
                </code>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <UsersIcon className="h-3 w-3" />
                  {topic.subscriber_count.toLocaleString()}
                </span>
              </div>
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
                <DropdownMenuItem asChild>
                  <Link
                    to="/$wsSlug/topics/$topicId"
                    params={{ wsSlug, topicId: topic.id }}
                  >
                    <PencilSimpleIcon className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                {!topic.is_active && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onActivate(topic.id);
                    }}
                  >
                    <PowerIcon className="mr-2 h-4 w-4" />
                    Activate
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(topic);
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
