import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CustomerForm({ onSave, onCancel, editing }) {
  const [form, setForm] = useState({ name: "", company: "", contact: "", customer_code: "", discount: 0 });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name || "",
        company: editing.company || "",
        contact: editing.contact || "",
        customer_code: editing.customer_code || "",
        discount: editing.discount ?? 0,
      });
    }
  }, [editing]);

  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.customer_code) return;
    onSave({ ...form, discount: Number(form.discount) || 0 });
    setForm({ name: "", company: "", contact: "", customer_code: "", discount: 0 });
  };

  return (
    <form onSubmit={submit} className="space-y-3 bg-card border border-border rounded-xl p-4">
      <h3 className="font-heading font-semibold">{editing ? "Edit customer" : "Add customer"}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="c_name">Name *</Label>
          <Input id="c_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c_code">Customer code *</Label>
          <Input id="c_code" value={form.customer_code} onChange={(e) => setForm({ ...form, customer_code: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c_company">Company</Label>
          <Input id="c_company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c_contact">Email / phone</Label>
          <Input id="c_contact" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="c_disc">Discount %</Label>
          <Input id="c_disc" type="number" min="0" max="100" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="font-heading bg-accent hover:bg-accent/90 text-accent-foreground">{editing ? "Update" : "Add"}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}