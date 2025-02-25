import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Device } from "@shared/schema";
import { format } from "date-fns";
import { Smartphone, MapPin, Clock, Tag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DeviceCardProps {
  device: Device;
  onStatusChange?: (status: Device["status"]) => void;
}

export function DeviceCard({ device, onStatusChange }: DeviceCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader className="flex-row justify-between items-start space-y-0">
        <div>
          <h3 className="font-semibold text-lg tracking-tight">{device.brandModel}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {device.uniqueId}
          </p>
        </div>
        <StatusBadge status={device.status} />
      </CardHeader>

      <CardContent>
        {device.picture && (
          <div className="mb-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={device.picture} alt={device.brandModel} />
              <AvatarFallback>
                <Smartphone className="h-8 w-8" />
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        <p className="text-sm text-card-foreground/90 mb-4">
          {device.description}
        </p>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            <span>{device.category}</span>
          </div>
          {device.serialNumber && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">S/N: {device.serialNumber}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{device.lastLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(device.reportedAt), "PPp")}</span>
          </div>
        </div>
      </CardContent>

      {onStatusChange && device.status !== "REVIEW" && (
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStatusChange("REVIEW")}
            className="w-full"
          >
            Submit for Review
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
