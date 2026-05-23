import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { createStaff, listStaff } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/staff")({ component: StaffPage });

function StaffPage() {
  const { role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fetchList = useServerFn(listStaff);
  const createFn = useServerFn(createStaff);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", role: "doctor" as "admin" | "doctor" | "receptionist", specialization: "",
  });

  useEffect(() => {
    if (!authLoading && role !== "admin") navigate({ to: "/dashboard" });
  }, [authLoading, role, navigate]);

  const load = async () => {
    setLoading(true);
    try { setRows(await fetchList()); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    setLoading(false);
  };
  useEffect(() => { if (role === "admin") load(); }, [role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createFn({ data: {
        full_name: form.full_name, email: form.email, password: form.password,
        role: form.role,
        specialization: form.role === "doctor" ? form.specialization || null : null,
      }});
      toast.success("Staff account created");
      setOpen(false);
      setForm({ full_name: "", email: "", password: "", role: "doctor", specialization: "" });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <AppShell title="Staff">
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rows.length} staff member{rows.length === 1 ? "" : "s"}</p>
            <Button onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Add staff</Button>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Specialization</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Loading...</TableCell></TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.user_id}>
                    <TableCell className="font-medium">{r.full_name || "—"}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell><span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide">{r.role}</span></TableCell>
                    <TableCell>{r.specialization ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="space-y-1.5"><Label>Full name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Password (min 8 chars)</Label>
              <Input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></div>
            <div className="space-y-1.5"><Label>Role</Label>
              <Select value={form.role} onValueChange={(v: any) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="doctor">Doctor</SelectItem>
                  <SelectItem value="receptionist">Receptionist</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.role === "doctor" && (
              <div className="space-y-1.5"><Label>Specialization</Label>
                <Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Cardiology" /></div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
