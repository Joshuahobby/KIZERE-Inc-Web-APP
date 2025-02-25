import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Document, Device } from "@shared/schema";
import { DocumentCard } from "@/components/document-card";
import { DeviceCard } from "@/components/device-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Search, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";

export default function SearchItems() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"documents" | "devices">("documents");

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents/search?q=${query}`],
    enabled: activeTab === "documents" && query.length > 0,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: [`/api/devices/search?q=${query}`],
    enabled: activeTab === "devices" && query.length > 0,
  });

  const isLoading = documentsLoading || devicesLoading;

  return (
    <div className="container py-8 max-w-5xl mx-auto px-4">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Search Lost & Found Items</h1>
        <p className="text-muted-foreground mb-6 text-center">
          Search for lost or found items using their unique identifiers
        </p>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => {
            setActiveTab(value as typeof activeTab);
            setQuery("");
          }}
          className="w-full max-w-2xl"
        >
          <TabsList className="grid grid-cols-2 w-full mb-6">
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="devices">Devices</TabsTrigger>
          </TabsList>

          <div className="mb-8">
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {activeTab === "documents" 
                  ? "Search using the Document Number or System-generated ID"
                  : "Search using the Device Serial Number or IMEI"
                }
              </AlertDescription>
            </Alert>

            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={activeTab === "documents" 
                  ? "Enter Document Number or System ID..." 
                  : "Enter Serial Number/IMEI..."
                }
                className="flex-1"
              />
              <Button variant="secondary">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <TabsContent value="documents">
            {query && (
              <div className="grid gap-6">
                {documentsLoading ? (
                  <div className="text-center py-8">
                    <span className="text-muted-foreground">Searching documents...</span>
                  </div>
                ) : documents?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No documents found matching your search.</p>
                    <p className="text-sm mt-2">Try searching with a different document number.</p>
                  </div>
                ) : (
                  documents?.map((document) => (
                    <DocumentCard 
                      key={document.id} 
                      document={document} 
                      showDetails={true}
                    />
                  ))
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="devices">
            {query && (
              <div className="grid gap-6">
                {devicesLoading ? (
                  <div className="text-center py-8">
                    <span className="text-muted-foreground">Searching devices...</span>
                  </div>
                ) : devices?.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No devices found matching your search.</p>
                    <p className="text-sm mt-2">Try searching with a different serial number.</p>
                  </div>
                ) : (
                  devices?.map((device) => (
                    <DeviceCard 
                      key={device.id} 
                      device={device} 
                      showDetails={true}
                    />
                  ))
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}