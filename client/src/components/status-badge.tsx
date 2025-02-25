import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  LOST: { color: "bg-red-100 text-red-800 hover:bg-red-100", label: "Lost" },
  FOUND: { color: "bg-green-100 text-green-800 hover:bg-green-100", label: "Found" },
  REVIEW: { color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100", label: "Review" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];

  return (
    <Badge className={cn("font-semibold", config.color)} variant="secondary">
      {config.label}
    </Badge>
  );
}