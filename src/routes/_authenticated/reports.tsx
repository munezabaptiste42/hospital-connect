import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, XCircle, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportPage });

interface Stats { total: number; completed: number; cancelled: number; pending: number; }

function ReportPage() {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(monthAgo);
  const [end, setEnd] = useState(today);
  const [stats, setStats] = useState<Stats | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const run = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (start > end) { toast.error("Start date must be before end date"); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("appointments")
      .select("id, status, appointment_date, patients(id, full_name)")
      .gte("appointment_date", start)
      .lte("appointment_date", end)
      .order("appointment_date", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const total = data?.length ?? 0;
    const completed = data?.filter((d) => d.status === "Completed").length ?? 0;
    const cancelled = data?.filter((d) => d.status === "Cancelled").length ?? 0;
    const pending = data?.filter((d) => d.status === "Pending").length ?? 0;
    setStats({ total, completed, cancelled, pending });

    const seen = new Map<string, string>();
    (data ?? []).forEach((d: any) => {
      if (d.patients && !seen.has(d.patients.id)) seen.set(d.patients.id, d.patients.full_name);
    });
    setPatients(Array.from(seen.entries()).map(([id, full_name]) => ({ id, full_name })));
  };

  return (
    <AppShell title="Reports">
      <Card>
        <CardContent className="p-6">
          <form onSubmit={run} className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Start date</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>End date</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Generating..." : "Generate report"}</Button>
          </form>
        </CardContent>
      </Card>

      {stats && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Stat label="Total appointments" value={stats.total} icon={CalendarDays} />
            <Stat label="Completed" value={stats.completed} icon={CheckCircle2} />
            <Stat label="Cancelled" value={stats.cancelled} icon={XCircle} />
            <Stat label="Unique patients" value={patients.length} icon={Users} accent />
          </div>

          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="mb-4 text-base font-semibold">Patients attended between {start} and {end}</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow><TableHead>Patient</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {patients.length === 0 ? (
                      <TableRow><TableCell className="py-6 text-center text-muted-foreground">No patients in this range.</TableCell></TableRow>
                    ) : patients.map((p) => (
                      <TableRow key={p.id}><TableCell className="font-medium">{p.full_name}</TableCell></TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${accent ? "bg-gold text-gold-foreground" : "bg-primary text-primary-foreground"}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
