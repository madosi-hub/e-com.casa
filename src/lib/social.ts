// E-com.casa — Social profile configuration
// Single source of truth for the store's social profiles.
// Rules:
// - A profile renders ONLY when `enabled` is true AND a real URL
// is configured. No fake profile URLs, no placeholder icons,
// no "coming soon" chips.
// - When E-com.casa's real profiles go live, add the URLs here —
// the footer renders them automatically.

export interface SocialLink {
  id: 'instagram' | 'facebook' | 'pinterest' | 'tiktok' | 'youtube' | 'linkedin';
  label: string;
  enabled: boolean;
  url: string | null;
}

export const SOCIAL_LINKS: SocialLink[] = [
  { id: 'instagram', label: 'Instagram', enabled: false, url: null },
  { id: 'facebook', label: 'Facebook', enabled: false, url: null },
  { id: 'pinterest', label: 'Pinterest', enabled: false, url: null },
  { id: 'tiktok', label: 'TikTok', enabled: false, url: null },
  { id: 'youtube', label: 'YouTube', enabled: false, url: null },
  { id: 'linkedin', label: 'LinkedIn', enabled: false, url: null },
];

/** Profiles that should actually render (enabled + real URL). */
export function activeSocialLinks(): SocialLink[] {
  return SOCIAL_LINKS.filter((s) => s.enabled && typeof s.url === 'string' && s.url.startsWith('https://'));
}
