export function cleanToken(raw: string): string {
  // Remove all Unicode punctuation characters and trim whitespace
  return raw.replace(/\p{P}+/gu, '').trim();
}
