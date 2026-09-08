export type ProviderChannel = "sms" | "push" | "email" | "in_app";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role: string | null;
  created_at: string;
}

export interface WorkspaceCreate {
  name: string;
  slug?: string;
}

export type MemberRole = "owner" | "admin" | "member" | "viewer";

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  role: MemberRole;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
}

export interface TeamInvite {
  id: string;
  email: string;
  role: MemberRole;
  invited_by: string | null;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface InviteInput {
  email: string;
  role: MemberRole;
}

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  last_used_ip: string | null;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  status: "active" | "revoked" | "expired";
}

export interface APIKeyCreateInput {
  name: string;
}

export interface APIKeyCreateResponse {
  id: string;
  name: string;
  key_prefix: string;
  api_key: string;
  created_at: string;
  created_by: string;
}

export interface Provider {
  id: string;
  name: string;
  type_name: string;
  provider_type: string;
  channel: ProviderChannel;
  is_active: boolean;
  priority: number;
  config: Record<string, unknown>;
  workspace: string;
}

export interface ProviderType {
  key: string;
  name: string;
  channel: ProviderChannel;
  schema: Record<string, unknown>;
  docs_url: string;
  icon_url: string;
}

export interface Device {
  id: string;
  platform: string;
  push_token: string;
  metadata: Record<string, unknown> | null;
  last_seen: string | null;
  is_active: boolean;
  archived_at: string | null;
}

export interface Subscriber {
  id: string;
  external_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone_number: string | null;
  timezone: string | null;
  locale: string | null;
  data: Record<string, unknown> | null;
  device_count: number;
  devices?: Device[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateSubscriberInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  timezone?: string;
  locale?: string;
  data?: Record<string, unknown>;
}

export interface CreateSubscriberInput {
  external_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone_number?: string;
  timezone?: string;
  locale?: string;
  data?: Record<string, unknown>;
}

export interface BulkDeleteInput {
  ids: string[];
}

export interface BulkDeleteResult {
  deactivated: number;
  not_found: number;
}

export interface SubscribersFilter {
  search?: string;
  is_active?: boolean;
  ordering?: string;
}

export type TemplateChannel = "push" | "sms" | "*";

export interface TemplateContent {
  title?: string;
  body: string;
  data_payload?: Record<string, unknown>;
  image_url?: string;
}

export interface Template {
  id: string;
  name: string;
  description: string | null;
  channel: TemplateChannel;
  content: TemplateContent;
  variables: Record<string, unknown>;
  is_active: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  channel: TemplateChannel;
  content: TemplateContent;
  variables?: Record<string, unknown>;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  channel?: TemplateChannel;
  content?: TemplateContent;
  variables?: Record<string, unknown>;
}

export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  subscriber_count: number;
  created_at: string;
  updated_at: string;
}

export interface TopicWithStats extends Topic {
  active_subscriptions: number;
  inactive_subscriptions: number;
}

export interface TopicSubscription {
  id: string;
  topic: string;
  topic_name: string;
  subscriber: string;
  subscriber_external_id: string;
  subscriber_name: string;
  subscribed_at: string;
  unsubscribed_at: string | null;
  source: "api" | "webhook" | "manual";
  metadata: Record<string, unknown> | null;
}

export interface CreateTopicInput {
  name: string;
  slug: string;
  description?: string;
}

export interface UpdateTopicInput {
  name?: string;
  description?: string;
}

export interface BulkSubscribeInput {
  subscriber_ids: string[];
  source?: "api" | "webhook" | "manual";
}

export interface BulkSubscribeResult {
  subscribed: number;
  already_subscribed: number;
  failed: number;
}

export interface BulkUnsubscribeResult {
  unsubscribed: number;
  requested: number;
}

export interface TopicStats {
  id: string;
  name: string;
  slug: string;
  total_subscriptions: number;
  active_subscriptions: number;
  inactive_subscriptions: number;
  by_source: Record<string, number>;
  created_at: string;
  updated_at: string;
}

export interface DashboardNotificationsMetrics {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  push: number;
  sms: number;
  in_app: number;
  success_total: number;
  failure_total: number;
}

export interface DashboardMetrics {
  notifications: DashboardNotificationsMetrics;
  in_app: {
    total: number;
    unread: number;
    read: number;
    archived: number;
    by_category: Record<string, number>;
  };
  resources?: {
    subscribers: number;
    providers: number;
    templates: number;
    topics: number;
  };
}

export interface DashboardRecentNotification {
  id: string;
  status: string;
  channels: string[];
  priority: string;
  title: string | null;
  body: string;
  subscriber_external_id: string;
  delivery_count: number;
  success_count: number;
  failure_count: number;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface NotificationComposeTopic {
  id: string;
  name: string;
  slug: string;
  active_subscribers: number;
}

export interface NotificationComposeContext {
  active_subscribers: number;
  topics: NotificationComposeTopic[];
  configured_channels: ProviderChannel[];
}

export interface SendNotificationInput {
  audience: "quick" | "topic" | "subscriber" | "bulk";
  subscriber_external_id?: string;
  subscriber_external_ids?: string[];
  topic_slug?: string;
  channels: ProviderChannel[];
  content: { title?: string; body: string };
  priority?: "high" | "normal";
  scheduled_at?: string | null;
}

export interface SendNotificationResponse {
  audience: SendNotificationInput["audience"];
  notifications_created: number;
  recipients_targeted: number;
  recipients_missing?: number;
  channels: ProviderChannel[];
}
