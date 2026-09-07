import type { ProviderChannel } from "@/lib/types";

export interface ProviderMeta {
  key: string;
  name: string;
  description: string;
  channel: ProviderChannel;
  accent: string;
  logo: string;
}

/**
 * Brand metadata for each registered provider type.
 * Maps provider_type key -> branding info used across cards and forms.
 */
export const PROVIDER_META: Record<string, ProviderMeta> = {
  arkesel: {
    key: "arkesel",
    name: "Arkesel",
    description: "Programmable SMS for African markets",
    channel: "sms",
    accent: "142 71% 45%",
    logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#1B8C4E"/><path d="M16 6L8 26h4l2-5h4l2 5h4L16 6zm0 8l2 5h-4l2-5z" fill="white"/></svg>`,
  },
  hubtel: {
    key: "hubtel",
    name: "Hubtel",
    description: "SMS & payments platform for West Africa",
    channel: "sms",
    accent: "199 89% 48%",
    logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#00A4E4"/><path d="M8 10h4v12H8V10zm12 0h4v12h-4V10zm-6 4h4v4h-4v-4z" fill="white"/></svg>`,
  },
  fcm: {
    key: "fcm",
    name: "Firebase Cloud Messaging",
    description: "Google's cross-platform push notification service",
    channel: "push",
    accent: "36 100% 50%",
    logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#FFCA28"/><path d="M10 24l3-14 3 6-3 2 6-2 3 8H10z" fill="#FF8F00"/><path d="M13 10l3 6-3 2 6-2 3-6" fill="#FFA000" fill-opacity="0.8"/><path d="M16 16l-3 2 6-2" fill="#F57C00"/></svg>`,
  },
  apns: {
    key: "apns",
    name: "Apple Push (APNs)",
    description: "Push notifications for iOS, macOS & Safari",
    channel: "push",
    accent: "0 0% 20%",
    logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#1D1D1F"/><path d="M20.3 11.2c-.7-.9-1.8-1.4-2.8-1.4-1.3 0-1.9.6-2.8.6-.9 0-1.7-.6-2.8-.6-1.2 0-2.5.7-3.3 2-1.1 1.8-.9 5.2.9 8.1.6 1 1.5 2.2 2.6 2.2 1 0 1.3-.7 2.7-.7 1.3 0 1.6.7 2.6.7 1.1 0 2-1.3 2.6-2.3.5-.7.6-1 1-1.8-2.6-1-3-4.5-.7-5.8zm-5-2.4c.6-.8 1.1-1.9 1-3-.9.1-2 .7-2.6 1.5-.6.7-1.1 1.8-1 2.9 1 0 2-.6 2.6-1.4z" fill="white"/></svg>`,
  },
  expo: {
    key: "expo",
    name: "Expo Push",
    description: "Managed push notifications for React Native",
    channel: "push",
    accent: "258 75% 55%",
    logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#000020"/><path d="M16 6c-1.5 0-2.5 1-3.5 2.5L7 20c-1 1.5-.5 4 1.5 4.5 1 .3 2 0 3-1L16 17l4.5 6.5c1 1 2 1.3 3 1 2-.5 2.5-3 1.5-4.5l-5.5-11.5C18.5 7 17.5 6 16 6z" fill="white"/></svg>`,
  },
};

/** Channel display configuration */
export const CHANNEL_META: Record<
  ProviderChannel,
  { label: string; accent: string; dotColor: string }
> = {
  email: {
    label: "Email",
    accent: "199 89% 48%",
    dotColor: "bg-sky-500",
  },
  sms: {
    label: "SMS",
    accent: "142 71% 45%",
    dotColor: "bg-emerald-500",
  },
  push: {
    label: "Push Notifications",
    accent: "36 100% 50%",
    dotColor: "bg-amber-500",
  },
  in_app: {
    label: "In-App",
    accent: "258 75% 55%",
    dotColor: "bg-violet-500",
  },
};

/**
 * Get provider metadata by key, with fallback for unknown providers.
 */
export function getProviderMeta(key: string): ProviderMeta {
  return (
    PROVIDER_META[key] ?? {
      key,
      name: key,
      description: "Notification provider",
      channel: "email" as ProviderChannel,
      accent: "0 0% 50%",
      logo: `<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="8" fill="#6B7280"/><path d="M10 12h12v8H10z" fill="white" fill-opacity="0.3"/><path d="M16 10v12M10 16h12" stroke="white" stroke-width="1.5"/></svg>`,
    }
  );
}

/**
 * Get provider icon URL from backend.
 * Matches the icon_url returned by the backend API.
 */
export function getProviderIconUrl(key: string): string {
  return `/icons/providers/${key}.svg`;
}

/**
 * Get provider documentation URL from backend.
 * Matches the docs_url returned by the backend API.
 */
export function getProviderDocsUrl(key: string): string | undefined {
  const docsUrls: Record<string, string> = {
    fcm: "https://firebase.google.com/docs/cloud-messaging",
    expo: "https://docs.expo.dev/push-notifications/overview/",
    apns: "https://developer.apple.com/documentation/usernotifications",
    arkesel: "https://developers.arkesel.com/",
    hubtel: "https://developers.hubtel.com/",
  };
  return docsUrls[key];
}
