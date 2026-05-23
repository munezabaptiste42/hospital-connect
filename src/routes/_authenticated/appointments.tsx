import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { listDoctors } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/appointments")({ component: AppointmentsPage });

interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: "Pending" | "Completed" | "Cancelled";
  patients?: { full_name: string };
  doctor_name?: string;
}

type Doctor = { id: string; full_name: string; specialization: string | null };
type Patient = { id: string; full_name: string };

const empty = { patient_id: "", doctor_id: "", appointment_date: "", appointment_time: "", status: "Pending" as const };

function AppointmentsPage() {
  const { role, user } = useAuth();
  const canEdit = role === "admin" || role === "receptionist";
  const fetchDoctors = useServerFn(listDoctors);

  const [rows, setRows] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [aRes, pRes, dRes] = await Promise.all([
      supabase.from("appointments").select("*, patients(full_name)").order("appointment_date", { ascending: false }),
      supabase.from("patients").select("id, full_name").order("full_name"),
      fetchDoctors(),
    ]);
    if (aRes.error) toast.error(aRes.error.message);
    const doctorMap = new Map((dRes ?? []).map((d) => [d.id, d.full_name]));
    setRows((aRes.data ?? []).map((r: any) => ({ ...r, doctor_name: doctorMap.get(r.doctor_id) ?? "—" })));
    setPatients(pRes.data ?? []);
    setDoctors(dRes ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (a: Appointment) => {
    setEditing(a);
    setForm({
      patient_id: a.patient_id, doctor_id: a.doctor_id,
      appointment_date: a.appointment_date, appointment_time: a.appointment_time.slice(0, 5),
      status: a.status,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = editing
      ? await supabase.from("appointments").update(form).eq("id", editing.id)
      : await supabase.from("appointments").insert(form);
    setSaving(false);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editing ? "Appointment updated" : "Appointment created");
    setOpen(false);
    load();
  };

  const setStatus = async (id: string, status: Appointment["status"]) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Status updated"); load(); }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("appointments").delete().eq("id", deleteId);
    if (error) toast.error(error.message); else { toast.success("Cancelled"); load(); }
    setDeleteId(null);
  };

  const visibleRows = role === "doctor" ? rows.filter((r) => r.doctor_id === user?.id) : rows;

  return (
    <AppShell title="Appointments">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{visibleRows.length} appointment{visibleRows.length === 1 ? "" : "s"}</p>
            {canEdit && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />New appointment</Button>}
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : visibleRows.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No appointments yet.</TableCell></TableRow>
                ) : visibleRows.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.patients?.full_name}</TableCell>
                    <TableCell>{a.doctor_name}</TableCell>
                    <TableCell>{a.appointment_date}</TableCell>
                    <TableCell>{a.appointment_time.slice(0, 5)}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        a.status === "Completed" ? "bg-primary/15 text-primary" :
                        a.status === "Cancelled" ? "bg-destructive/15 text-destructive" :
                        "bg-gold/25 text-foreground"
                      }`}>{a.status}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {role === "doctor" && a.status === "Pending" && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "Completed")}>Complete</Button>
                      )}
                      {canEdit && (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteId(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </>
                      )}
                    </TableCell>
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
            <DialogTitle>{editing ? "Edit appointment" : "New appointment"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="space-y-1.5">
              <Label>Patient</Label>
              <Select value={form.patient_id} onValueChange={(v) => setForm({ ...form, patient_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                <SelectContent>{patients.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Doctor</Label>
              <Select value={form.doctor_id} onValueChange={(v) => setForm({ ...form, doctor_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                <SelectContent>{doctors.map((d) => <SelectItem key={d.id} value={d.id}>Dr. {d.full_name}{d.specialization ? ` · ${d.specialization}` : ""}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.appointment_date} onChange={(e) => setForm({ ...form, appointment_date: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input type="time" value={form.appointment_time} onChange={(e) => setForm({ ...form, appointment_time: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !form.patient_id || !form.doctor_id}>{saving ? "Saving..." : "Save"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the appointment.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
