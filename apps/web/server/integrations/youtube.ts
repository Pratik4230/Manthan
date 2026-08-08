import { fetchTranscript } from "youtube-transcript"

export {
  canonicalYoutubeUrl,
  extractYoutubeVideoId,
  isYoutubeUrl,
} from "@/lib/youtube-url"

export async function fetchYoutubeTranscriptText(
  urlOrVideoId: string
): Promise<string> {
  const segments = await fetchTranscript(urlOrVideoId)
  const text = segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()

  if (!text) {
    throw new Error("YouTube transcript is empty")
  }

  return text
}
