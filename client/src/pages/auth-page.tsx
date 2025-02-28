import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect based on user role
  if (user) {
    if (user.isAdmin) {
      setLocation("/admin");
    } else {
      setLocation("/");
    }
    return null;
  }

  const handleLogin = (data: InsertUser) => {
    loginMutation.mutate(data, {
      onSuccess: (user) => {
        // Redirect to admin dashboard if admin user
        if (user.isAdmin) {
          setLocation("/admin");
        } else {
          setLocation("/");
        }
      }
    });
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              Welcome to Kizere
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <AuthForm
                  mode="login"
                  onSubmit={handleLogin}
                  isPending={loginMutation.isPending}
                />
              </TabsContent>

              <TabsContent value="register">
                <AuthForm
                  mode="register"
                  onSubmit={(data) => registerMutation.mutate(data)}
                  isPending={registerMutation.isPending}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <div className="hidden md:flex items-center justify-center bg-primary/5 p-8">
        <div className="max-w-md space-y-4">
          <h2 className="text-3xl font-bold">Lost Something?</h2>
          <p className="text-muted-foreground">
            Kizere helps you track, report, and recover your lost belongings. Join our
            community to:
          </p>
          <ul className="space-y-2 list-disc list-inside text-muted-foreground">
            <li>Register your valuable items</li>
            <li>Report lost or found items</li>
            <li>Search through our database</li>
            <li>Get notified when your items are found</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function AuthForm({ 
  mode,
  onSubmit,
  isPending,
}: { 
  mode: "login" | "register";
  onSubmit: (data: any) => void;
  isPending: boolean;
}) {
  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input {...field} autoComplete="username" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "login" ? "Login" : "Register"}
        </Button>
      </form>
    </Form>
  );
}