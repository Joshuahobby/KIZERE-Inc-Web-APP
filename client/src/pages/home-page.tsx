import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Document, Device } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, Loader2, ClipboardList } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DocumentCard } from "@/components/document-card";
import { DeviceCard } from "@/components/device-card";

export default function HomePage() {
  const { user } = useAuth();

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: ["/api/devices"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ type, id, status }: { type: 'document' | 'device', id: number; status: 'LOST' | 'FOUND' | 'REVIEW' }) => {
      const res = await apiRequest("PATCH", `${type === 'document' ? '/api/documents' : '/api/devices'}/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    },
  });

  // Calculate statistics
  const stats = {
    documents: {
      total: documents?.length || 0,
      lost: documents?.filter(d => d.status === "LOST").length || 0,
      found: documents?.filter(d => d.status === "FOUND").length || 0,
      review: documents?.filter(d => d.status === "REVIEW").length || 0,
    },
    devices: {
      total: devices?.length || 0,
      lost: devices?.filter(d => d.status === "LOST").length || 0,
      found: devices?.filter(d => d.status === "FOUND").length || 0,
      review: devices?.filter(d => d.status === "REVIEW").length || 0,
    }
  };

  const isLoading = documentsLoading || devicesLoading;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.username}
          </p>
        </div>

        <div className="flex gap-2">
          <Button asChild>
            <Link to="/report">
              <Plus className="mr-2 h-4 w-4" />
              Report Item
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Search Items
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/register-item">
              <ClipboardList className="mr-2 h-4 w-4" />
              Register Your Item
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{stats.documents.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lost:</span>
                <span className="font-medium text-red-600">{stats.documents.lost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Found:</span>
                <span className="font-medium text-green-600">{stats.documents.found}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{stats.devices.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lost:</span>
                <span className="font-medium text-red-600">{stats.devices.lost}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Found:</span>
                <span className="font-medium text-green-600">{stats.devices.found}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documents:</span>
                <span className="font-medium text-yellow-600">{stats.documents.review}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Devices:</span>
                <span className="font-medium text-yellow-600">{stats.devices.review}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (!documents?.length && !devices?.length) ? (
        <div className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">No Items Reported</h3>
          <p className="text-muted-foreground mb-4">
            Start by reporting a lost or found item
          </p>
          <div className="flex gap-2 justify-center">
            <Button asChild>
              <Link to="/report">
                <Plus className="mr-2 h-4 w-4" />
                Report Item
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/register-item">
                <ClipboardList className="mr-2 h-4 w-4" />
                Register Your Item
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Documents</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents?.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onStatusChange={(status) =>
                    statusMutation.mutate({ type: 'document', id: doc.id, status })
                  }
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Devices</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devices?.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onStatusChange={(status) =>
                    statusMutation.mutate({ type: 'device', id: device.id, status })
                  }
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}