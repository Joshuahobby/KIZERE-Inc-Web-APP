import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Loader2, Plus, ClipboardList } from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-4">
          <Button asChild>
            <Link to="/report">
              <Plus className="w-4 h-4 mr-2" />
              Report Lost/Found Item
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/register-item">
              <ClipboardList className="w-4 h-4 mr-2" />
              Register Your Item
            </Link>
          </Button>
        </div>
      </div>

      {/* Rest of the dashboard content */}
    </div>
  );
}