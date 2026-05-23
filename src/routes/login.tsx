import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { adminExists, bootstrapFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, signIn, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    adminExists().then((r) => setHasAdmin(r.exists)).catch(() => setHasAdmin(true));
  }, []);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) toast.error(error);
    else toast.success("Welcome back");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gold text-gold-foreground">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <div className="text-base font-semibold">King Faisal Hospital</div>
            <div className="text-xs opacity-75">Kigali, Rwanda</div>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-semibold leading-tight">
            Care delivered<br /><span className="text-gold">with precision.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm opacity-80">
            Manage appointments and medical reports in one place — built for the receptionists
            and doctors of King Faisal Hospital.
          </p>
        </div>
        <div className="text-xs opacity-60">© {new Date().getFullYear()} King Faisal Hospital Rwanda</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>Access your hospital workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
            {hasAdmin === false && (
              <div className="mt-6 rounded-md border border-gold/40 bg-gold/10 p-3 text-xs text-foreground">
                No administrator exists yet.{" "}
                <Link to="/setup" className="font-semibold underline">Create the first admin</Link>.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
