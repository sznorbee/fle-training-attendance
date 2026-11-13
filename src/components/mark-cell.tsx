import type { MarkStatus } from "@/db/schema";
import { MARK_STYLE } from "@/lib/mark-style";
import { cn } from "@/lib/utils";

type Props = { mark?: { status: MarkStatus; note: string | null }; className?: string };

/** One day of one athlete, shown like the spreadsheet cell (0 / 1 / 2 / note). */
export function MarkCell({ mark, className }: Props) {
  if (!mark || mark.status === "cleared") {
    return <span className={cn("inline-block size-6 rounded", className)} />;
  }
  const style = MARK_STYLE[mark.status];
  return (
    <span
      title={mark.note ? `${style.label}: ${mark.note}` : style.label}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded border text-xs font-medium",
        className,
        // Last, so a background passed for empty cells never hides the mark's colour.
        style.className,
      )}
    >
      {style.symbol}
    </span>
  );
}
