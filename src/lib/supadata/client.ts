const SUPADATA_BASE = "https://api.supadata.ai/v1/youtube/transcript";
const RAPIDAPI_BASE =
  "https://youtube-transcript3.p.rapidapi.com/api/transcript";

export interface TranscriptResult {
  video_id: string;
  title: string;
  language: string;
  is_partial: boolean;
  transcript: string;
  transcript_length: number;
}

async function fetchFromSupadata(videoId: string): Promise<TranscriptResult> {
  const url = `${SUPADATA_BASE}?videoId=${encodeURIComponent(videoId)}&lang=en`;
  const res = await fetch(url, {
    headers: { "x-api-key": process.env.SUPADATA_API_KEY ?? "" },
  });

  if (!res.ok) {
    throw new Error(`supadata:${res.status}`);
  }

  const data = await res.json();

  const transcript: string =
    typeof data.content === "string"
      ? data.content
      : Array.isArray(data.content)
        ? (data.content as Array<{ text: string }>)
            .map((s) => s.text)
            .join(" ")
        : "";

  return {
    video_id: videoId,
    title: data.title ?? "",
    language: data.lang ?? "en",
    is_partial: (data.availableLangs?.length ?? 0) > 1,
    transcript,
    transcript_length: transcript.length,
  };
}

async function fetchFromRapidApi(videoId: string): Promise<TranscriptResult> {
  const url = `${RAPIDAPI_BASE}?videoId=${encodeURIComponent(videoId)}`;
  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": "youtube-transcript3.p.rapidapi.com",
      "x-rapidapi-key": process.env.RAPIDAPI_KEY ?? "",
    },
  });

  if (!res.ok) {
    throw new Error(`rapidapi:${res.status}`);
  }

  const data = await res.json();

  const segments: Array<{ text: string }> = Array.isArray(data.transcript)
    ? data.transcript
    : [];
  const transcript = segments.map((s) => s.text).join(" ");

  return {
    video_id: videoId,
    title: data.title ?? "",
    language: "en",
    is_partial: false,
    transcript,
    transcript_length: transcript.length,
  };
}

/**
 * Fetch a YouTube transcript.
 * Primary: Supadata.ai REST API.
 * Fallback: RapidAPI YouTube Transcript (on 404 or 429 from Supadata).
 * Throws { code: "transcript_unavailable" } if both fail.
 */
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptResult> {
  try {
    return await fetchFromSupadata(videoId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const isRetryable =
      msg.startsWith("supadata:404") || msg.startsWith("supadata:429");

    if (!isRetryable) {
      throw { code: "transcript_unavailable", cause: msg };
    }
  }

  try {
    return await fetchFromRapidApi(videoId);
  } catch {
    throw { code: "transcript_unavailable" };
  }
}
