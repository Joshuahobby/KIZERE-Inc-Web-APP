import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Device, ItemStatus } from "@shared/schema";
import { format } from "date-fns";
import { Smartphone, MapPin, Clock, Tag, UserCircle2, Calendar, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DeviceCardProps {
  device: Device;
  onStatusChange?: (status: ItemStatus) => void;
  showDetails?: boolean;
}

export function DeviceCard({ device, onStatusChange, showDetails = false }: DeviceCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader className="flex-row justify-between items-start space-y-0">
        <div>
          <h3 className="font-semibold text-lg tracking-tight">{device.brandModel}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {device.uniqueId}
          </p>
        </div>
        <StatusBadge status={device.status as ItemStatus} />
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

          {showDetails && (
            <>
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="font-medium mb-2">Device Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <span>Manufacturer: {device.metadata.manufacturer}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span>Model Number: {device.metadata.modelNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    <span>Color: {device.metadata.color}</span>
                  </div>
                  {device.metadata.purchaseDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Purchase Date: {format(new Date(device.metadata.purchaseDate), "PP")}</span>
                    </div>
                  )}
                  {device.metadata.identifyingMarks && (
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      <span>Identifying Marks: {device.metadata.identifyingMarks}</span>
                    </div>
                  )}
                </div>
              </div>

              {device.ownerInfo && Object.keys(device.ownerInfo).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-medium mb-2">Owner Contact</h4>
                  <div className="space-y-2">
                    {device.ownerInfo.name && (
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4" />
                        <span>{device.ownerInfo.name}</span>
                      </div>
                    )}
                    {device.ownerInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{device.ownerInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
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