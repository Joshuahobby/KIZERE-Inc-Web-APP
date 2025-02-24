import { useAuth } from "@/hooks/use-auth";
import { Route, Redirect } from "wouter";
import { Loader2 } from "lucide-react";

export function ProtectedAdminRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user || !user.isAdmin) {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }

  return <Component />;
}
