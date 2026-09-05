import type { Bullet } from "./types";

export type BulletLineFlag = {
  key: string;
  label: string;
  tone: "ok" | "warn" | "muted";
};

export function bulletLineFlags(bullet?: Bullet): BulletLineFlag[] {
  if (!bullet) return [];
  const flags: BulletLineFlag[] = [];
  if (bullet.has_metric) flags.push({ key: "metric", label: "Has metric", tone: "ok" });
  else flags.push({ key: "metric", label: "Add a number or %", tone: "warn" });
  if (bullet.has_tools) flags.push({ key: "tools", label: "Names tools", tone: "ok" });
  if (bullet.has_first_person) flags.push({ key: "fp", label: "First person — rewrite", tone: "warn" });
  if (bullet.xyz_pattern === "xyz") flags.push({ key: "xyz", label: "XYZ pattern", tone: "ok" });
  else if (bullet.xyz_pattern === "yxz") flags.push({ key: "yxz", label: "YXZ pattern", tone: "ok" });
  else flags.push({ key: "xyz", label: "Weak structure", tone: "muted" });
  return flags;
}

export function primaryBulletFlag(flags: BulletLineFlag[]): BulletLineFlag | undefined {
  return flags.find((f) => f.tone === "warn") ?? flags[0];
}
