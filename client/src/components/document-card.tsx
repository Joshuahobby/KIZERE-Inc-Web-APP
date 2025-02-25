import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import { Document, ItemStatus } from "@shared/schema";
import { format } from "date-fns";
import { FileText, MapPin, Clock, UserCircle2, Calendar, Phone } from "lucide-react";

interface DocumentCardProps {
  document: Document;
  onStatusChange?: (status: ItemStatus) => void;
  showDetails?: boolean;
}

export function DocumentCard({ document, onStatusChange, showDetails = false }: DocumentCardProps) {
  return (
    <Card className="w-full hover:shadow-lg transition-shadow">
      <CardHeader className="flex-row justify-between items-start space-y-0">
        <div>
          <h3 className="font-semibold text-lg tracking-tight">{document.title}</h3>
          <p className="text-sm text-muted-foreground font-mono">
            {document.uniqueId}
          </p>
        </div>
        <StatusBadge status={document.status as ItemStatus} />
      </CardHeader>

      <CardContent>
        <p className="text-sm text-card-foreground/90 mb-4">
          {document.description}
        </p>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>{document.category}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{document.lastLocation}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{format(new Date(document.reportedAt), "PPp")}</span>
          </div>

          {showDetails && (
            <>
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="font-medium mb-2">Document Details</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Issue Date: {format(new Date(document.metadata.issueDate), "PP")}</span>
                  </div>
                  {document.metadata.expiryDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Expiry Date: {format(new Date(document.metadata.expiryDate), "PP")}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Document Number: {document.metadata.documentNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4" />
                    <span>Issuer: {document.metadata.issuer}</span>
                  </div>
                </div>
              </div>

              {document.ownerInfo && Object.keys(document.ownerInfo).length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h4 className="font-medium mb-2">Owner Contact</h4>
                  <div className="space-y-2">
                    {document.ownerInfo.name && (
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-4 w-4" />
                        <span>{document.ownerInfo.name}</span>
                      </div>
                    )}
                    {document.ownerInfo.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{document.ownerInfo.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </CardContent>

      {onStatusChange && document.status !== "REVIEW" && (
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