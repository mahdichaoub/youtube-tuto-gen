const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extracts the 11-character YouTube video ID from any valid YouTube URL format.
 * Returns null for invalid, private, or unrecognised URLs.
 *
 * Supported formats:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 *   https://www.youtube.com/v/VIDEO_ID
 */
export function extractVideoId(url: string): string | null {
  if (!url || typeof url !== "string") return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const { hostname, pathname, searchParams } = parsed;
  const isYouTube =
    hostname === "youtube.com" ||
    hostname === "www.youtube.com" ||
    hostname === "m.youtube.com" ||
    hostname === "youtu.be";

  if (!isYouTube) return null;

  let id: string | null = null;

  if (hostname === "youtu.be") {
    // https://youtu.be/VIDEO_ID
    id = pathname.slice(1).split("?")[0] ?? null;
  } else {
    // /watch?v=VIDEO_ID
    const fromQuery = searchParams.get("v");
    if (fromQuery) {
      id = fromQuery;
    } else {
      // /embed/VIDEO_ID  |  /shorts/VIDEO_ID  |  /v/VIDEO_ID
      const match = pathname.match(
        /^\/(?:embed|shorts|v)\/([a-zA-Z0-9_-]{11})/
      );
      id = match?.[1] ?? null;
    }
  }

  if (!id || !VIDEO_ID_RE.test(id)) return null;
  return id;
}
