import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertDocumentSchema, insertDeviceSchema, type InsertDocument, type InsertDevice } from "@shared/schema";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

export default function ReportItem() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"document" | "device">("document");

  const documentForm = useForm<InsertDocument>({
    resolver: zodResolver(insertDocumentSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "OTHER",
      status: "LOST",
      lastLocation: "",
      ownerInfo: {},
      metadata: {
        issuer: "",
        issueDate: "",
        documentNumber: "",
      },
    },
  });

  const deviceForm = useForm<InsertDevice>({
    resolver: zodResolver(insertDeviceSchema),
    defaultValues: {
      category: "COMPUTER",
      brandModel: "",
      description: "",
      status: "LOST",
      lastLocation: "",
      ownerInfo: {},
      serialNumber: "",
      metadata: {
        manufacturer: "",
        modelNumber: "",
        color: "",
      },
    },
  });

  const documentMutation = useMutation({
    mutationFn: async (data: InsertDocument) => {
      const res = await apiRequest("POST", "/api/documents", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setLocation("/");
    },
  });

  const deviceMutation = useMutation({
    mutationFn: async (data: InsertDevice) => {
      const res = await apiRequest("POST", "/api/devices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      setLocation("/");
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Report an Item</h1>
          <p className="text-muted-foreground">
            Provide detailed information about the lost or found item
          </p>
        </div>

        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            All fields marked with * are required. Please provide accurate information to help with identification.
          </AlertDescription>
        </Alert>

        <Tabs 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
            <TabsTrigger value="document">Document</TabsTrigger>
            <TabsTrigger value="device">Electronic Device</TabsTrigger>
          </TabsList>

          <TabsContent value="document">
            <Form {...documentForm}>
              <form
                onSubmit={documentForm.handleSubmit((data) => documentMutation.mutate(data))}
                className="space-y-8"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Enter the general details about the document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={documentForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Title *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={documentForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
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
                                <SelectItem value="ID">ID/Passport</SelectItem>
                                <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                                <SelectItem value="LICENSE">License</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={documentForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status *</FormLabel>
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
                                <SelectItem value="LOST">Lost</SelectItem>
                                <SelectItem value="FOUND">Found</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Document Details</CardTitle>
                    <CardDescription>
                      Provide specific information to help identify the document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={documentForm.control}
                      name="metadata.issuer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issuing Authority *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Department of Motor Vehicles" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={documentForm.control}
                        name="metadata.issueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Date *</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={documentForm.control}
                        name="metadata.expiryDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Expiry Date</FormLabel>
                            <FormControl>
                              <Input {...field} type="date" />
                            </FormControl>
                            <FormDescription>Optional</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={documentForm.control}
                      name="metadata.documentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Number *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            This is crucial for identification purposes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location & Description</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={documentForm.control}
                      name="lastLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Known Location *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={documentForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[100px]" />
                          </FormControl>
                          <FormDescription>
                            Include any distinguishing features or additional details
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
                  <Button type="submit" disabled={documentMutation.isPending}>
                    {documentMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Report
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="device">
            <Form {...deviceForm}>
              <form
                onSubmit={deviceForm.handleSubmit((data) => deviceMutation.mutate(data))}
                className="space-y-8"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Enter the general details about the device
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={deviceForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Device Type *</FormLabel>
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
                                <SelectItem value="COMPUTER">Computer</SelectItem>
                                <SelectItem value="PHONE">Phone</SelectItem>
                                <SelectItem value="TABLET">Tablet</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={deviceForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Status *</FormLabel>
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
                                <SelectItem value="LOST">Lost</SelectItem>
                                <SelectItem value="FOUND">Found</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={deviceForm.control}
                      name="brandModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brand & Model *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Apple MacBook Pro 2021" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Device Details</CardTitle>
                    <CardDescription>
                      Provide specific information to help identify the device
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={deviceForm.control}
                      name="serialNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Serial Number/IMEI *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormDescription>
                            This is required and helps verify device ownership
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deviceForm.control}
                      name="metadata.manufacturer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Manufacturer *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., Apple, Samsung, etc." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-6 sm:grid-cols-2">
                      <FormField
                        control={deviceForm.control}
                        name="metadata.modelNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Model Number *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={deviceForm.control}
                        name="metadata.color"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Color *</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={deviceForm.control}
                      name="metadata.purchaseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" />
                          </FormControl>
                          <FormDescription>Optional</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deviceForm.control}
                      name="metadata.identifyingMarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identifying Marks</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Any stickers, scratches, or unique markings"
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormDescription>Optional</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Location & Description</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={deviceForm.control}
                      name="lastLocation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Known Location *</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={deviceForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description *</FormLabel>
                          <FormControl>
                            <Textarea {...field} className="min-h-[100px]" />
                          </FormControl>
                          <FormDescription>
                            Include any distinguishing features or additional details
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
                  <Button type="submit" disabled={deviceMutation.isPending}>
                    {deviceMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Report
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}