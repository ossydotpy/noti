
import { useNavigate, useParams } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { DotsThreeIcon, EyeIcon } from "@phosphor-icons/react";
import { Subscriber } from "@/hooks/use-subscribers";

interface SubscriberRowActionsProps {
  subscriber: Subscriber;
}

export function SubscriberRowActions({ subscriber }: SubscriberRowActionsProps) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { wsSlug?: string };
  const wsSlug = params?.wsSlug;

  const handleView = () => {
    navigate({ to: `/${wsSlug}/subscribers/${subscriber.id}` });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-end"
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <DotsThreeIcon className="h-4 w-4" weight="bold" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={handleView}>
            <EyeIcon className="mr-2 h-4 w-4" />
            View
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
