import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Item } from "@shared/schema";
import { format } from "date-fns";

export function ItemCard({ 
  item,
  onStatusChange,
}: { 
  item: Item;
  onStatusChange?: (newStatus: Item["status"]) => void;
}) {
  return (
    <Card className="w-full">
      <CardHeader className="flex-row justify-between items-start">
        <div>
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-sm text-muted-foreground">ID: {item.uniqueId}</p>
        </div>
        <StatusBadge status={item.status} />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <p className="text-sm">{item.description}</p>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{item.category}</span>
            <span>•</span>
            <span>{item.location}</span>
            <span>•</span>
            <span>{format(new Date(item.reportedAt), "MMM d, yyyy")}</span>
          </div>
        </div>
      </CardContent>

      {onStatusChange && (
        <CardFooter className="gap-2">
          {item.status === "LOST" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onStatusChange("FOUND")}
            >
              Mark as Found
            </Button>
          )}
          {item.status === "FOUND" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onStatusChange("CLAIMED")}
            >
              Mark as Claimed
            </Button>
          )}
          {item.status === "CLAIMED" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onStatusChange("RETURNED")}
            >
              Mark as Returned
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
