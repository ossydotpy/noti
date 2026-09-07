import { useState } from "react";
import { motion, type Variants } from "motion/react";
import { PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
    useWorkspaceAPIKeys,
    useCreateAPIKey,
    useRevokeAPIKey,
} from "@/hooks/use-api-keys";
import type { APIKey, APIKeyCreateResponse } from "@/lib/types";
import { ApiKeyList } from "@/components/api-keys/api-key-list";
import { CreateApiKeyModal } from "@/components/api-keys/create-api-key-modal";
import { ApiKeyCreatedDialog } from "@/components/api-keys/api-key-created-dialog";
import { RevokeApiKeyDialog } from "@/components/api-keys/revoke-api-key-dialog";
import { createFileRoute } from "@tanstack/react-router";

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

export const Route = createFileRoute("/_authenticated/$wsSlug/api-keys")({
    component: ApiKeysPage,
});

function ApiKeysPage() {
    const { data: apiKeys, isLoading } = useWorkspaceAPIKeys();
    const createMutation = useCreateAPIKey();
    const revokeMutation = useRevokeAPIKey();

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [createdApiKey, setCreatedApiKey] = useState<APIKeyCreateResponse | null>(null);
    const [isCreatedDialogOpen, setIsCreatedDialogOpen] = useState(false);
    const [apiKeyToRevoke, setApiKeyToRevoke] = useState<APIKey | null>(null);
    const [isRevokeDialogOpen, setIsRevokeDialogOpen] = useState(false);

    const handleCreate = async (name: string) => {
        try {
            const result = await createMutation.mutateAsync({ name });
            setCreatedApiKey(result);
            setIsCreateModalOpen(false);
            setIsCreatedDialogOpen(true);
        } catch {
            // Error is handled by the mutation's onError
        }
    };

    const handleRevokeClick = (apiKey: APIKey) => {
        setApiKeyToRevoke(apiKey);
        setIsRevokeDialogOpen(true);
    };

    const handleRevokeConfirm = async () => {
        if (!apiKeyToRevoke) return;

        try {
            await revokeMutation.mutateAsync(apiKeyToRevoke.id);
            setIsRevokeDialogOpen(false);
            setApiKeyToRevoke(null);
        } catch {
            // Error is handled by the mutation's onError
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8"
        >
            <motion.div variants={itemVariants}>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">API Keys</h1>
                        <p className="text-muted-foreground">
                            Manage API keys for authenticating requests to the notification API.
                        </p>
                    </div>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        disabled={isLoading}
                        className="h-12 rounded-2xl px-6 shadow-lg shadow-primary/20 shrink-0"
                    >
                        <PlusIcon className="h-4 w-4 mr-2" weight="bold" />
                        Create Key
                    </Button>
                </div>
            </motion.div>

            <motion.div variants={itemVariants}>
                <ApiKeyList
                    apiKeys={apiKeys || []}
                    isLoading={isLoading}
                    onRevoke={handleRevokeClick}
                />
            </motion.div>

            <CreateApiKeyModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSubmit={handleCreate}
                isPending={createMutation.isPending}
            />

            <ApiKeyCreatedDialog
                open={isCreatedDialogOpen}
                onOpenChange={setIsCreatedDialogOpen}
                apiKey={createdApiKey}
            />

            <RevokeApiKeyDialog
                open={isRevokeDialogOpen}
                onOpenChange={setIsRevokeDialogOpen}
                onConfirm={handleRevokeConfirm}
                apiKeyName={apiKeyToRevoke?.name || ""}
                isPending={revokeMutation.isPending}
            />
        </motion.div>
    );
}
