import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Item } from "@shared/schema";
import { ItemCard } from "@/components/item-card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container py-8 max-w-5xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Welcome, {user?.username}</h1>
          <p className="text-muted-foreground">
            Track and manage your reported items
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
            <Link to="/search">Search Items</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items?.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            onStatusChange={(status) =>
              statusMutation.mutate({ id: item.id, status })
            }
          />
        ))}
        
        {items?.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No items reported yet. Click "Report Item" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
