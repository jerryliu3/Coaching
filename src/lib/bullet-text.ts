import type { Bullet } from "./types";

/** One line per bullet in the editor textarea. */
export function bulletsToText(bullets: Bullet[]): string {
  return bullets.map((b) => b.current_text).join("\n");
}

/** Parse textarea content into bullet lines (strips leading list markers). */
export function textToBulletLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}
