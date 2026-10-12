/** Hex colour tokens from tokens.css, keyed by name without the leading dashes (e.g. "ink"). */
export function parseColorTokens(css: string): Record<string, string> {
  return Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1], m[2]]));
}
