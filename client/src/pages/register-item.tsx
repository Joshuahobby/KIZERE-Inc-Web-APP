import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRegisteredItemSchema, type InsertRegisteredItem } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
  const [proofFile, setProofFile] = useState<File | null>(null);
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
        console.log('Starting registration with data:', data);

        // Create the form data
        const formData = new FormData();
        formData.append("itemType", data.itemType);
        formData.append("officialId", data.officialId);
        formData.append("metadata", JSON.stringify(data.metadata || {}));

        // Add pictures
        if (selectedFiles.length === 0) {
          throw new Error("At least one picture is required");
        }

        selectedFiles.forEach((file) => {
          formData.append("pictures", file);
        });

        // Add proof of ownership if exists
        if (proofFile) {
          formData.append("proofOfOwnership", proofFile);
        }

        console.log('Submitting form data...');
        const response = await fetch("/api/register-item", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Registration failed:', errorText);
          throw new Error(errorText);
        }

        const result = await response.json();
        console.log('Registration successful:', result);
        return result;
      } catch (error) {
        console.error('Registration error:', error);
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
      console.log('Selected picture files:', files.map(f => f.name));
      setSelectedFiles(files);
    }
  };

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      console.log('Selected proof file:', file.name);
      setProofFile(file);
    }
  };

  const onSubmit = async (data: InsertRegisteredItem) => {
    console.log('Form submitted with data:', data);

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
      console.error('Form submission error:', error);
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
                          onChange={handleProofFileChange}
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

        <Alert className="mt-8">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please provide accurate information and clear pictures of your item. This will help in verification and recovery if needed.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}