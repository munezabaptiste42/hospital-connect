import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, CalendarDays, FileText, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: DashboardPage });

type Stats = { patients: number; appointments: number; pending: number; completed: number };

function DashboardPage() {
  const { profile, role } = useAuth();
  const [stats, setStats] = useState<Stats>({ patients: 0, appointments: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [upcoming, setUpcoming] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [p, a, pend, comp, up] = await Promise.all([
        supabase.from("patients").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Pending"),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("status", "Completed"),
        supabase
          .from("appointments")
          .select("id, appointment_date, appointment_time, status, patients(full_name)")
          .gte("appointment_date", new Date().toISOString().slice(0, 10))
          .order("appointment_date", { ascending: true })
          .limit(5),
      ]);
      setStats({
        patients: p.count ?? 0,
        appointments: a.count ?? 0,
        pending: pend.count ?? 0,
        completed: comp.count ?? 0,
      });
      setUpcoming(up.data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell title="Dashboard">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back, <span className="text-primary">{profile?.full_name || "—"}</span>
        </h2>
        <p className="text-sm text-muted-foreground">Role: <span className="uppercase tracking-wide">{role}</span></p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patients" value={stats.patients} icon={Users} loading={loading} />
        <StatCard label="Appointments" value={stats.appointments} icon={CalendarDays} loading={loading} />
        <StatCard label="Pending" value={stats.pending} icon={FileText} loading={loading} accent />
        <StatCard label="Completed" value={stats.completed} icon={CheckCircle2} loading={loading} />
      </div>

      <Card className="mt-6">
        <CardContent className="p-6">
          <h3 className="mb-4 text-base font-semibold">Upcoming appointments</h3>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming appointments.</p>
          ) : (
            <ul className="divide-y">
              {upcoming.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{u.patients?.full_name}</div>
                    <div className="text-xs text-muted-foreground">{u.appointment_date} · {u.appointment_time}</div>
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{u.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}

function StatCard({
  label, value, icon: Icon, loading, accent,
}: { label: string; value: number; icon: any; loading: boolean; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent ? "bg-gold text-gold-foreground" : "bg-primary text-primary-foreground"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{loading ? "—" : value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
