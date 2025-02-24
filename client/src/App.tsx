import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ReportItem from "@/pages/report-item";
import SearchItems from "@/pages/search-items";
import AdminDashboard from "@/pages/admin/dashboard";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { ProtectedAdminRoute } from "./lib/protected-admin-route";
import { Layout } from "@/components/layout";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        <Layout>
          <Switch>
            <ProtectedRoute path="/" component={HomePage} />
            <ProtectedRoute path="/report" component={ReportItem} />
            <ProtectedRoute path="/search" component={SearchItems} />
            <ProtectedAdminRoute path="/admin" component={AdminDashboard} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;