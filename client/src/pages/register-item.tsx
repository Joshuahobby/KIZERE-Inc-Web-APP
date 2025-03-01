import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRegisteredItemSchema, type InsertRegisteredItem } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Loader2, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function RegisterItem() {
  const [, setLocation] = useLocation();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertRegisteredItem>({
    resolver: zodResolver(insertRegisteredItemSchema),
    defaultValues: {
      itemType: "DOCUMENT",
      officialId: "",
      pictures: [],
      proofOfOwnership: undefined,
      metadata: {},
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: InsertRegisteredItem) => {
      setUploading(true);
      try {
        // Upload pictures first
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload file: ${await response.text()}`);
          }

          const result = await response.json();
          return result.url;
        });

        const pictureUrls = await Promise.all(uploadPromises);

        // Create registration data
        const formData = new FormData();
        formData.append("itemType", data.itemType);
        formData.append("officialId", data.officialId);
        formData.append("pictures", JSON.stringify(pictureUrls));
        if (data.proofOfOwnership) {
          formData.append("proofOfOwnership", data.proofOfOwnership);
        }
        formData.append("metadata", JSON.stringify(data.metadata || {}));

        // Submit registration
        const response = await fetch("/api/register-item", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Registration failed: ${await response.text()}`);
        }

        return response.json();
      } catch (error) {
        console.error("Registration error:", error);
        throw error instanceof Error ? error : new Error("Registration failed");
      } finally {
        setUploading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/registered-items"] });
      toast({
        title: "Success",
        description: "Item registered successfully",
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
    }
  };

  const onSubmit = async (data: InsertRegisteredItem) => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one picture of the item",
        variant: "destructive",
      });
      return;
    }

    try {
      await registerMutation.mutateAsync(data);
    } catch (error) {
      // Error will be handled by mutation's onError
      console.error("Form submission failed:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Register an Item</h1>
          <p className="text-muted-foreground">
            Register your valuable items for better protection and recovery
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please provide accurate information and clear pictures of your item. This will help in verification and recovery if needed.
          </AlertDescription>
        </Alert>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>
                  Enter the general details about your item
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Type *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DOCUMENT">Document</SelectItem>
                          <SelectItem value="DEVICE">Electronic Device</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="officialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Official ID *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Serial Number or Document ID" />
                      </FormControl>
                      <FormDescription>
                        Enter the unique identifier of your item
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pictures & Documentation</CardTitle>
                <CardDescription>
                  Upload clear pictures and proof of ownership
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <FormLabel htmlFor="pictures">Pictures *</FormLabel>
                  <Input
                    id="pictures"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload multiple clear pictures of your item
                  </p>
                </div>

                <FormField
                  control={form.control}
                  name="proofOfOwnership"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Proof of Ownership</FormLabel>
                      <FormControl>
                        <Input 
                          type="file"
                          accept=".pdf,.jpg,.png"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              field.onChange(e.target.files[0]);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Upload receipt, warranty card, or other proof of ownership (optional)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/")}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={registerMutation.isPending || uploading}
              >
                {(registerMutation.isPending || uploading) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Register Item
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}