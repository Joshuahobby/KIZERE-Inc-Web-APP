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
  Loader2,
  UserCheck,
  Users,
  AlertTriangle,
  Shield,
  LineChart,
  Activity,
  Database,
  Clock,
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
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";

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

type IpAllowlist = {
  id: number;
  ipRange: string;
  description: string;
  enabled: boolean;
};

type SecurityAuditLog = {
  id: number;
  userId: number;
  timestamp: string;
  actionType: string;
  success: boolean;
  details: object;
};

type Session = {
  id: string;
  userAgent: string;
  ipAddress: string;
  lastActivity: string;
};

type TwoFactorSetup = {
  qrCode: string;
  secret: string;
  backupCodes: string[];
};

type InsertIpAllowlist = {
  ipRange: string;
  description: string;
};


export default function AdminDashboard() {
  const { toast } = useToast();
  const [newRole, setNewRole] = useState<NewRole>({
    name: "",
    description: "",
    permissions: [],
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [show2FADialog, setShow2FADialog] = useState(false);
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);

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

  const { data: ipAllowlist, isLoading: ipLoading } = useQuery<IpAllowlist[]>({
    queryKey: ["/api/admin/ip-allowlist"],
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<SecurityAuditLog[]>({
    queryKey: ["/api/admin/audit-logs"],
  });

  const { data: activeSessions, isLoading: sessionsLoading } = useQuery<{
    current: string;
    sessions: Session[];
  }>({
    queryKey: ["/api/admin/sessions"],
  });


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

  const setup2FAMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/2fa/setup");
      return res.json();
    },
    onSuccess: (data: TwoFactorSetup) => {
      setTwoFactorSetup(data);
      setShow2FADialog(true);
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/admin/2fa/verify", { token });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled for your account.",
      });
      setShow2FADialog(false);
    },
  });

  const addIpAllowlistMutation = useMutation({
    mutationFn: async (data: InsertIpAllowlist) => {
      const res = await apiRequest("POST", "/api/admin/ip-allowlist", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ip-allowlist"] });
      toast({
        title: "IP Range Added",
        description: "The IP range has been added to the allowlist.",
      });
    },
  });

  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/sessions/${sessionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/sessions"] });
      toast({
        title: "Session Terminated",
        description: "The selected session has been terminated.",
      });
    },
  });

  const isLoading = statsLoading || usersLoading || moderationLoading || rolesLoading ||
    systemLoading || activityLoading || apiUsageLoading || ipLoading || auditLoading || sessionsLoading;

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


      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Security</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Two-Factor Auth</span>
                <Switch
                  checked={users?.[0]?.twoFactorEnabled || false} // Assuming first user for demo, needs proper user context
                  onCheckedChange={() => {
                    if (!(users?.[0]?.twoFactorEnabled || false)) {
                      setup2FAMutation.mutate();
                    }
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Sessions</span>
                <Badge>{activeSessions?.sessions.length || 0}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(activeSessions?.sessions || []).map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.userAgent}</TableCell>
                  <TableCell>{session.ipAddress}</TableCell>
                  <TableCell>{format(new Date(session.lastActivity), "PPp")}</TableCell>
                  <TableCell>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={session.id === activeSessions?.current}
                      onClick={() => terminateSessionMutation.mutate(session.id)}
                    >
                      Terminate
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>IP Access Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>IP Range</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(ipAllowlist || []).map((ip) => (
                  <TableRow key={ip.id}>
                    <TableCell>{ip.ipRange}</TableCell>
                    <TableCell>{ip.description}</TableCell>
                    <TableCell>
                      <Badge variant={ip.enabled ? "default" : "secondary"}>
                        {ip.enabled ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="destructive" size="sm">Remove</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(auditLogs || []).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{format(new Date(log.timestamp), "PPp")}</TableCell>
                    <TableCell>{users?.find(u => u.id === log.userId)?.username}</TableCell>
                    <TableCell>{log.actionType}</TableCell>
                    <TableCell>
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {JSON.stringify(log.details)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set Up Two-Factor Authentication</AlertDialogTitle>
            <AlertDialogDescription>
              Scan this QR code with your authenticator app to enable 2FA.
              Keep your backup codes safe - you'll need them if you lose access to your authenticator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4">
            {twoFactorSetup && (
              <>
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={twoFactorSetup.qrCode} size={200} />
                </div>
                <div>
                  <Label>Backup Codes</Label>
                  <ScrollArea className="h-[100px] border rounded-md p-2">
                    {twoFactorSetup.backupCodes.map((code, i) => (
                      <div key={i} className="font-mono text-sm">{code}</div>
                    ))}
                  </ScrollArea>
                </div>
                <div className="space-y-2">
                  <Label>Verification Code</Label>
                  <Input
                    type="text"
                    placeholder="Enter code from authenticator app"
                    onChange={(e) => verify2FAMutation.mutate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}