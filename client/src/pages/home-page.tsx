import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Search, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function HomePage() {
  const { user } = useAuth();

  const { data: items, isLoading } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: Item["status"] }) => {
      const res = await apiRequest("PATCH", `/api/items/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
    },
  });

  // Calculate statistics
  const stats = {
    total: items?.length || 0,
    lost: items?.filter(i => i.status === "LOST").length || 0,
    found: items?.filter(i => i.status === "FOUND").length || 0,
    returned: items?.filter(i => i.status === "RETURNED").length || 0,
  };

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
          <Button variant="outline" asChild>
            <Link to="/search">
              <Search className="mr-2 h-4 w-4" />
              Search Items
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lost Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.lost}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Found Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.found}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Returned Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.returned}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <h3 className="text-lg font-semibold mb-2">No Items Yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by reporting a lost or found item
            </p>
            <Button asChild>
              <Link to="/report">
                <Plus className="mr-2 h-4 w-4" />
                Report Item
              </Link>
            </Button>
          </div>
        ) : (
          items?.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onStatusChange={(status) =>
                statusMutation.mutate({ id: item.id, status })
              }
            />
          ))
        )}
      </div>
    </div>
  );
}