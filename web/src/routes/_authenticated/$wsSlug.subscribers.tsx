import { motion, type Variants } from "motion/react";
import { SubscriberList } from "@/components/subscribers/subscriber-list";
import { Outlet, createFileRoute, useMatchRoute } from "@tanstack/react-router";

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
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

export const Route = createFileRoute("/_authenticated/$wsSlug/subscribers")({
  component: SubscribersPage,
});

function SubscribersPage() {
  const { wsSlug } = Route.useParams();
  const matchRoute = useMatchRoute();

  if (matchRoute({ to: "/$wsSlug/subscribers/$subscriberId", params: { wsSlug, subscriberId: "" }, fuzzy: false })) {
    return <Outlet />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
        <p className="text-muted-foreground">
          Manage your subscribers and their notification preferences
        </p>
      </motion.div>

      <SubscriberList />
    </motion.div>
  );
}
