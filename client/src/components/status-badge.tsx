import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig = {
  LOST: { color: "bg-red-100 text-red-800 hover:bg-red-100", label: "Lost" },
  FOUND: { color: "bg-green-100 text-green-800 hover:bg-green-100", label: "Found" },
  CLAIMED: { color: "bg-blue-100 text-blue-800 hover:bg-blue-100", label: "Claimed" },
  RETURNED: { color: "bg-gray-100 text-gray-800 hover:bg-gray-100", label: "Returned" },
} as const;

export function StatusBadge({ status }: { status: keyof typeof statusConfig }) {
  const config = statusConfig[status];
  
  return (
    <Badge className={cn("font-semibold", config.color)} variant="secondary">
      {config.label}
    </Badge>
  );
}
