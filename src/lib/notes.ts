/**
 * The pure half of a group note: how long one may be, and what normalising it
 * means. Imported by both the Server Action and the form, so the limit and the
 * cleanup are one answer rather than two that can drift.
 */

/**
 * Also spelled in `0011_group_notes.sql` as a check constraint, and nowhere
 * else. The Zod refusal quotes this number, so raising it in both places is the
 * whole change.
 */
export const NOTE_MAX_LENGTH = 4000;

/**
 * A textarea posts its value with CRLF line endings, which would otherwise cost
 * two characters per line break against the limit and store a `\r` nobody
 * typed. Trimmed at the ends, untouched in the middle: the blank line somebody
 * put between two people's presents is theirs to keep.
 */
export function normaliseNote(body: string): string {
  return body.replace(/\r\n/g, "\n").trim();
}
