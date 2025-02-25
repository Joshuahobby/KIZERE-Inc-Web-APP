import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Document, Device } from "@shared/schema";
import { DocumentCard } from "@/components/document-card";
import { DeviceCard } from "@/components/device-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Search } from "lucide-react";
import { Link } from "wouter";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function SearchItems() {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"documents" | "devices">("documents");

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: [`/api/documents?q=${query}`],
    enabled: activeTab === "documents" && query.length > 0,
  });

  const { data: devices, isLoading: devicesLoading } = useQuery<Device[]>({
    queryKey: [`/api/devices?q=${query}`],
    enabled: activeTab === "devices" && query.length > 0,
  });

  const isLoading = documentsLoading || devicesLoading;

  return (
    <div className="container py-8 max-w-5xl">
      <Button variant="ghost" asChild className="mb-4">
        <Link to="/">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="flex flex-col items-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Search Lost & Found Items</h1>
        <p className="text-muted-foreground mb-4">
          Search for documents or devices by title, description, or location
        </p>

        <div className="w-full max-w-md flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Start typing to search..."
          />
          <Button variant="secondary">
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
        <TabsList className="mb-4">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          {query && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documentsLoading && <div>Searching documents...</div>}

              {documents?.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}

              {documents?.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No documents found matching your search.
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="devices">
          {query && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {devicesLoading && <div>Searching devices...</div>}

              {devices?.map((device) => (
                <DeviceCard key={device.id} device={device} />
              ))}

              {devices?.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No devices found matching your search.
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}