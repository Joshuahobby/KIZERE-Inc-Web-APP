import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";
import { Home, Search, Plus, LogOut, User, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
          {user?.isAdmin && (
            <NavLink href="/admin" isActive={location === "/admin"}>
              <Settings className="mr-2 h-4 w-4" />
              Admin
            </NavLink>
          )}
        </nav>

        <div className="absolute bottom-4 w-52">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full flex items-center justify-center p-2">
                <Avatar className="h-8 w-8 overflow-hidden">
                  {user?.profilePicture ? (
                    <div className="w-full h-full relative">
                      <img 
                        src={user.profilePicture} 
                        alt={user.username}
                        className="absolute inset-0 w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <AvatarFallback>
                      {user?.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem className="py-2">
                <span className="text-sm font-medium">{user?.username}</span>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </a>
              </DropdownMenuItem>
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