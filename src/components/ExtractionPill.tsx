import { Badge } from "@/components/ui";
import { extractionTone, humanize } from "@/lib/labels";

/** One extraction value as a toned pill, e.g. Reorder intent → "Will reorder". */
export function ExtractionPill({ field, value }: { field: string; value: string | null | undefined }) {
  const tone = extractionTone(field, value);
  return (
    <Badge tone={tone} dot={tone !== "muted"}>
      {value ? humanize(value) : "—"}
    </Badge>
  );
}
