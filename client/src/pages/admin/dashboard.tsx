import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, UserCheck, Users, AlertTriangle, Shield, 
  LineChart, Activity, Database, Clock 
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Document, Device, Role, User } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";

type AdminStats = {
  totalUsers: number;
  documents: {
    total: number;
    byStatus: Record<string, number>;
    unmoderated: number;
  };
  devices: {
    total: number;
    byStatus: Record<string, number>;
    unmoderated: number;
  };
  returnRate: {
    total: number;
    returned: number;
    rate: number;
  };
};

type ModerationData = {
  documents: Document[];
  devices: Device[];
};

type NewRole = {
  name: string;
  description: string;
  permissions: string[];
};

type SystemMetrics = {
  apiResponseTime: number;
  errorRate: number;
  activeUsers: number;
  cpuUsage: number;
  memoryUsage: number;
};

type UserActivityStats = {
  recentLogins: number;
  activeModeration: number;
  itemsReported: number;
};

type ApiUsageStats = {
  totalRequests: number;
  averageResponseTime: number;
  errorRate: number;
  topEndpoints: { endpoint: string; count: number }[];
};

export default function AdminDashboard() {
  const { toast } = useToast();
  const [newRole, setNewRole] = useState<NewRole>({
    name: "",
    description: "",
    permissions: [],
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  // Add queries for new analytics data
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: roles, isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: moderationData, isLoading: moderationLoading } = useQuery<ModerationData>({
    queryKey: ["/api/admin/moderation"],
  });

  const { data: systemMetrics, isLoading: systemLoading } = useQuery<SystemMetrics>({
    queryKey: ["/api/admin/system-metrics"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: userActivity, isLoading: activityLoading } = useQuery<UserActivityStats>({
    queryKey: ["/api/admin/user-activity"],
  });

  const { data: apiUsage, isLoading: apiUsageLoading } = useQuery<ApiUsageStats>({
    queryKey: ["/api/admin/api-usage"],
  });

  // Keep existing mutations...
  const moderateDocumentMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest("POST", `/api/admin/moderation/documents/${documentId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Document moderated",
        description: "The document has been approved and is now visible to users.",
      });
    },
  });

  const moderateDeviceMutation = useMutation({
    mutationFn: async (deviceId: number) => {
      const res = await apiRequest("POST", `/api/admin/moderation/devices/${deviceId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Device moderated",
        description: "The device has been approved and is now visible to users.",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, isAdmin, roleId }: { id: number; isAdmin?: boolean; roleId?: number }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { isAdmin, roleId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User updated",
        description: "User permissions have been updated successfully.",
      });
    },
  });

  const createRoleMutation = useMutation({
    mutationFn: async (role: NewRole) => {
      const res = await apiRequest("POST", "/api/admin/roles", role);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create role");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/roles"] });
      toast({
        title: "Role created",
        description: "New role has been created successfully.",
      });
      setNewRole({ name: "", description: "", permissions: [] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isLoading = statsLoading || usersLoading || moderationLoading || rolesLoading ||
    systemLoading || activityLoading || apiUsageLoading;

  const handleCreateRole = () => {
    if (!newRole.name.trim()) {
      toast({
        title: "Validation error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }
    createRoleMutation.mutate(newRole);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, roles, moderate content, and view system analytics
        </p>
      </div>

      {/* System Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            {userActivity && (
              <div className="text-xs text-muted-foreground mt-1">
                {userActivity.recentLogins} active today
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Return Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.returnRate?.rate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats?.returnRate?.returned} of {stats?.returnRate?.total} items returned
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {systemMetrics?.errorRate === 0 ? "Healthy" : "Warning"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {systemMetrics?.errorRate.toFixed(2)}% error rate
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Performance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {apiUsage?.averageResponseTime.toFixed(0)}ms
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {apiUsage?.totalRequests} requests today
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Documents Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Documents
                  </div>
                  <div className="text-2xl font-bold">
                    {stats?.documents.total || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Pending Review
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.documents.unmoderated || 0}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Status Distribution
                </div>
                <div className="space-y-2">
                  {stats?.documents.byStatus && Object.entries(stats.documents.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <StatusBadge status={status as any} />
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devices Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Total Devices
                  </div>
                  <div className="text-2xl font-bold">
                    {stats?.devices.total || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Pending Review
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {stats?.devices.unmoderated || 0}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Status Distribution
                </div>
                <div className="space-y-2">
                  {stats?.devices.byStatus && Object.entries(stats.devices.byStatus).map(([status, count]) => (
                    <div key={status} className="flex justify-between items-center">
                      <StatusBadge status={status as any} />
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  CPU Usage
                </div>
                <div className="text-2xl font-bold">
                  {systemMetrics?.cpuUsage.toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-2">
                  Memory Usage
                </div>
                <div className="text-2xl font-bold">
                  {systemMetrics?.memoryUsage.toFixed(1)}%
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium text-muted-foreground mb-2">
                API Endpoints Performance
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiUsage?.topEndpoints.map((endpoint) => (
                    <TableRow key={endpoint.endpoint}>
                      <TableCell>{endpoint.endpoint}</TableCell>
                      <TableCell className="text-right">{endpoint.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Management */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Role Management</CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">Create New Role</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Role Name</Label>
                  <Input
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="Enter role name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Enter role description"
                  />
                </div>
                <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending}>
                  {createRoleMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Create Role
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Users Assigned</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(roles || []).map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-medium">{role.name}</TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    {(users || []).filter((user) => user.roleId === role.id).length}
                  </TableCell>
                  <TableCell>{format(new Date(role.createdAt), "PPp")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Content Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
        </CardHeader>
        <CardContent>
          {(!moderationData?.documents.length && !moderationData?.devices.length) ? (
            <div className="text-center py-8 text-muted-foreground">
              No items pending moderation
            </div>
          ) : (
            <div className="space-y-8">
              {/* Documents Moderation */}
              {moderationData?.documents.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Documents</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moderationData.documents.map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell className="font-medium">{doc.title}</TableCell>
                          <TableCell>{doc.category}</TableCell>
                          <TableCell>
                            <StatusBadge status={doc.status as any} />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => moderateDocumentMutation.mutate(doc.id)}
                              disabled={moderateDocumentMutation.isPending}
                            >
                              {moderateDocumentMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              <UserCheck className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Devices Moderation */}
              {moderationData?.devices.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Devices</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Brand & Model</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {moderationData.devices.map((device) => (
                        <TableRow key={device.id}>
                          <TableCell className="font-medium">{device.brandModel}</TableCell>
                          <TableCell>{device.category}</TableCell>
                          <TableCell>
                            <StatusBadge status={device.status as any} />
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              onClick={() => moderateDeviceMutation.mutate(device.id)}
                              disabled={moderateDeviceMutation.isPending}
                            >
                              {moderateDeviceMutation.isPending && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              <UserCheck className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Management */}
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Admin Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users || []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{format(new Date(user.createdAt), "PPp")}</TableCell>
                  <TableCell>
                    <Select
                      value={user.roleId?.toString() || ""}
                      onValueChange={(value) =>
                        updateUserMutation.mutate({
                          id: user.id,
                          roleId: parseInt(value),
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {(roles || []).map((role) => (
                          <SelectItem key={role.id} value={role.id.toString()}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={user.isAdmin ? "admin" : "user"}
                      onValueChange={(value) =>
                        updateUserMutation.mutate({
                          id: user.id,
                          isAdmin: value === "admin",
                        })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {updateUserMutation.isPending && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}