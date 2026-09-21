export const PROVIDER_MEDIA_PREFIX = 'https://www.nuraltainteriores.online/pt/';
export const PROVIDER_MEDIA_MIRROR = 'https://raw.githubusercontent.com/nexflowx-hub/nuraltainteriores/main/public/pt/';

export function mirrorProviderMedia(src: string): string {
  return src.startsWith(PROVIDER_MEDIA_PREFIX)
    ? `${PROVIDER_MEDIA_MIRROR}${src.slice(PROVIDER_MEDIA_PREFIX.length)}`
    : src;
}

export function mirrorGallery(gallery: string): string {
  return gallery.split(',').map((src) => mirrorProviderMedia(src.trim())).join(',');
}
