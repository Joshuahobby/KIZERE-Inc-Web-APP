import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Item } from "@shared/schema";
import { format } from "date-fns";
import { MapPin, Clock, Tag } from "lucide-react";

export function ItemCard({ 
  item,
  onStatusChange,
}: { 
  item: Item;
  onStatusChange?: (newStatus: Item["status"]) => void;
}) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader className="flex-row justify-between items-start space-y-0">
        <div>
          <h3 className="font-semibold text-lg tracking-tight">{item.name}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {item.uniqueId}
          </p>
        </div>
        <StatusBadge status={item.status} />
      </CardHeader>

      <CardContent>
        <p className="text-sm text-card-foreground/90 mb-4">
          {item.description}
        </p>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>{item.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{item.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(item.reportedAt), "PPp")}</span>
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
              className="w-full"
            >
              Mark as Found
            </Button>
          )}
          {item.status === "FOUND" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onStatusChange("CLAIMED")}
              className="w-full"
            >
              Mark as Claimed
            </Button>
          )}
          {item.status === "CLAIMED" && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onStatusChange("RETURNED")}
              className="w-full"
            >
              Mark as Returned
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}