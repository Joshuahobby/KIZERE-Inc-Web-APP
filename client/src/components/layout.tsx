import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Home, Search, Plus, LogOut, User } from "lucide-react";

export function NavLink({ href, children, isActive }: { href: string; children: React.ReactNode; isActive?: boolean }) {
  return (
    <Button
      variant={isActive ? "secondary" : "ghost"}
      className="w-full justify-start"
      asChild
    >
      <a href={href}>{children}</a>
    </Button>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 border-r bg-sidebar p-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-sidebar-foreground">Kizere</h1>
          <p className="text-sm text-sidebar-foreground/60">Lost & Found Platform</p>
        </div>

        <nav className="space-y-1">
          <NavLink href="/" isActive={location === "/"}>
            <Home className="mr-2 h-4 w-4" />
            Dashboard
          </NavLink>
          <NavLink href="/report" isActive={location === "/report"}>
            <Plus className="mr-2 h-4 w-4" />
            Report Item
          </NavLink>
          <NavLink href="/search" isActive={location === "/search"}>
            <Search className="mr-2 h-4 w-4" />
            Search Items
          </NavLink>
        </nav>

        <div className="absolute bottom-4 w-52">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start">
                <User className="mr-2 h-4 w-4" />
                {user?.username}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-52">
              <DropdownMenuItem
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-background">
        {children}
      </div>
    </div>
  );
}
