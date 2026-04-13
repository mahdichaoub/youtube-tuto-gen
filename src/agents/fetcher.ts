import { fetchTranscript, type TranscriptResult } from "@/lib/supadata/client";
import { extractVideoId } from "@/lib/validate-url";

export type FetcherOutput = TranscriptResult;

/**
 * Fetcher agent — no AI calls.
 * Extracts the video ID, fetches the transcript via Supadata (with RapidAPI fallback).
 * Throws { code: "transcript_unavailable" } if both sources fail.
 * Throws { code: "invalid_url" } if the URL is not a valid YouTube URL.
 */
export async function runFetcher(videoUrl: string): Promise<FetcherOutput> {
  const videoId = extractVideoId(videoUrl);
  if (!videoId) {
    throw { code: "invalid_url" };
  }

  return fetchTranscript(videoId);
}
