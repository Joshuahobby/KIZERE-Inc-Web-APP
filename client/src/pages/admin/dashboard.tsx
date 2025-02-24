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
import { Loader2, UserCheck, Users, AlertTriangle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AdminDashboard() {
  const { toast } = useToast();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/admin/users"],
  });

  const { data: unmoderatedItems, isLoading: moderationLoading } = useQuery({
    queryKey: ["/api/admin/moderation"],
  });

  const moderateMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest("POST", `/api/admin/moderation/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/moderation"] });
      toast({
        title: "Item moderated",
        description: "The item has been approved and is now visible to users.",
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, isAdmin }: { id: number; isAdmin: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, { isAdmin });
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

  if (statsLoading || usersLoading || moderationLoading) {
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
          Manage users, moderate content, and view system analytics
        </p>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalItems}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {stats?.unmoderatedItems} pending moderation
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Items by Category</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {Object.entries(stats?.itemsByCategory || {}).map(([category, count]) => (
              <div key={category}>
                <div className="text-sm font-medium">{category}</div>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "PPp")}
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

      {/* Content Moderation */}
      <Card>
        <CardHeader>
          <CardTitle>Content Moderation</CardTitle>
        </CardHeader>
        <CardContent>
          {unmoderatedItems?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No items pending moderation
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reported By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmoderatedItems?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>{item.reportedBy}</TableCell>
                    <TableCell>{item.status}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => moderateMutation.mutate(item.id)}
                        disabled={moderateMutation.isPending}
                      >
                        {moderateMutation.isPending && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
