import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { listDoctors } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/medical-reports")({ component: ReportsPage });

interface ReportRow {
  id: string; patient_id: string; doctor_id: string;
  diagnosis: string; prescription: string; report_date: string;
  patients?: { full_name: string };
  doctor_name?: string;
}

function ReportsPage() {
  const { role, user } = useAuth();
  const canCreate = role === "doctor";
  const fetchDoctors = useServerFn(listDoctors);

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [patients, setPatients] = useState<{ id: string; full_name: string }[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    appointment_id: "",
    patient_id: "",
    diagnosis: "",
    prescription: "",
    report_date: new Date().toISOString().slice(0, 10),
  });

  const load = async () => {
    setLoading(true);
    const [rRes, pRes, aRes, dRes] = await Promise.all([
      supabase.from("medical_reports").select("*, patients(full_name)").order("report_date", { ascending: false }),
      supabase.from("patients").select("id, full_name").order("full_name"),
      role === "doctor"
        ? supabase.from("appointments").select("id, patient_id, appointment_date, patients(full_name)").eq("doctor_id", user!.id).eq("status", "Pending")
        : Promise.resolve({ data: [] as any[] }),
      fetchDoctors(),
    ]);
    const docMap = new Map((dRes ?? []).map((d) => [d.id, d.full_name]));
    setRows((rRes.data ?? []).map((r: any) => ({ ...r, doctor_name: docMap.get(r.doctor_id) ?? "—" })));
    setPatients(pRes.data ?? []);
    setAppointments((aRes as any).data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = {
      appointment_id: form.appointment_id || null,
      patient_id: form.patient_id,
      doctor_id: user.id,
      diagnosis: form.diagnosis,
      prescription: form.prescription,
      report_date: form.report_date,
    };
    const { error } = await supabase.from("medical_reports").insert(payload);
    if (!error && form.appointment_id) {
      await supabase.from("appointments").update({ status: "Completed" }).eq("id", form.appointment_id);
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Medical report saved");
    setOpen(false);
    setForm({ appointment_id: "", patient_id: "", diagnosis: "", prescription: "", report_date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const visibleRows = role === "doctor" ? rows.filter((r) => r.doctor_id === user?.id) : rows;

  return (
    <AppShell title="Medical Reports">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{visibleRows.length} report{visibleRows.length === 1 ? "" : "s"}</p>
            {canCreate && <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />New report</Button>}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Diagnosis</TableHead>
                  <TableHead>Prescription</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : visibleRows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No reports yet.</TableCell></TableRow>
                ) : visibleRows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.patients?.full_name}</TableCell>
                    <TableCell>Dr. {r.doctor_name}</TableCell>
                    <TableCell>{r.report_date}</TableCell>
                    <TableCell className="max-w-xs"><div className="line-clamp-2 text-sm">{r.diagnosis}</div></TableCell>
                    <TableCell className="max-w-xs"><div className="line-clamp-2 text-sm">{r.prescription}</div></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New medical report</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            {appointments.length > 0 && (
              <div className="space-y-1.5">
                <Label>From pending appointment (optional)</Label>
                <Select
                  value={form.appointment_id}
                  onValueChange={(v) => {
                    const a = appointments.find((x) => x.id === v);
                    setForm({ ...form, appointment_id: v, patient_id: a?.patient_id ?? form.patient_id });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Pick appointment" /></SelectTrigger>
                  <SelectContent>
                    {appointments.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.patients?.full_name} — {a.appointment_date}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Report date</Label>
              <Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Textarea rows={3} value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Prescription</Label>
              <Textarea rows={3} value={form.prescription} onChange={(e) => setForm({ ...form, prescription: e.target.value })} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.patient_id}>{saving ? "Saving..." : "Save report"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
