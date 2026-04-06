/** Keep list (EventCard) and detail (EventDetail) frames identical so the same asset looks consistent. */
export const EVENT_FEATURED_IMAGE_ASPECT_RATIO = 16 / 9;

/** Behind `resizeMode="contain"` letterboxing for non-16:9 admin uploads */
export const EVENT_FEATURED_IMAGE_FRAME_BG = "#081319";

export function getEventFeaturedImageUri(event) {
  if (!event || typeof event !== "object") return null;
  const uri =
    event.featuredImage ||
    event.featured_image ||
    event.banner_url ||
    event.bannerUrl ||
    null;
  return typeof uri === "string" && uri.trim() ? uri.trim() : null;
}
