/** Stable hash so the same phone always lands in the same group across re-imports and syncs. */
export function hashToUnit(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function assignGroup(phone: string, calledShare: number): "called" | "control" {
  return hashToUnit(phone) < calledShare ? "called" : "control";
}
