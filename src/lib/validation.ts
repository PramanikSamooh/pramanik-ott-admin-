/**
 * URL validation utilities for the admin panel.
 * Prevents dangerous protocols (javascript:, data:, vbscript:, etc.)
 * from being saved to Firestore.
 */

const DANGEROUS_PROTOCOLS = [
  "javascript:",
  "data:",
  "vbscript:",
  "blob:",
  "file:",
];

/**
 * Checks if a URL starts with https:// or http://
 * Empty strings return true (field is optional).
 */
export function isValidUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") return true; // empty is OK (optional field)
  return /^https?:\/\//i.test(trimmed);
}

/**
 * Checks if a URL is a valid YouTube video URL or video ID.
 * Empty strings return true (field is optional).
 */
export function isValidYouTubeInput(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === "") return true;
  // Accept raw 11-char video IDs
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return true;
  // Accept YouTube URLs (must be https/http)
  if (!/^https?:\/\//i.test(trimmed)) return false;
  return /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//i.test(trimmed);
}

/**
 * Strips dangerous protocols from a URL. Returns empty string if the URL
 * uses a disallowed protocol. Passes through valid http(s) URLs unchanged.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed === "") return "";
  const lower = trimmed.toLowerCase();
  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(proto)) return "";
  }
  if (!isValidUrl(trimmed)) return "";
  return trimmed;
}
