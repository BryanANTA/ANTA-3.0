import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { Users, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CustomerForm from "@/components/customer/CustomerForm";
import { toast } from "sonner";

export default function ManageCustomers() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: () => base44.entities.Customer.list("-created_date", 5000),
  });

  const q = search.toLowerCase();
  const filtered = customers.filter(
    (c) => !search ||
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.customer_code?.toLowerCase().includes(q) ||
      c.contact?.toLowerCase().includes(q)
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ["customers"] });

  const handleSave = async (form) => {
    try {
      if (editing) {
        await base44.entities.Customer.update(editing.id, form);
        toast.success("Customer updated");
      } else {
        await base44.entities.Customer.create(form);
        toast.success("Customer added");
      }
      setEditing(null);
      setShowForm(false);
      invalidate();
    } catch (e) {
      toast.error(e.message || "Failed to save customer");
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await base44.entities.Customer.delete(c.id);
      toast.success("Customer deleted");
      invalidate();
    } catch (e) {
      toast.error(e.message || "Failed to delete");
    }
  };

  if (user && user.role !== "admin") {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <h1 className="font-heading font-bold text-2xl mb-1">Admins only</h1>
        <p className="text-muted-foreground">You don't have access to this page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7" /> Customers
          </h1>
          <p className="text-muted-foreground mt-1">Manage customers and their discount rates.</p>
        </div>
        <Button
          className="font-heading bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => { setEditing(null); setShowForm(true); }}
        >
          Add customer
        </Button>
      </div>

      {showForm && (
        <div className="mb-6">
          <CustomerForm
            editing={editing}
            onSave={handleSave}
            onCancel={() => { setEditing(null); setShowForm(false); }}
          />
        </div>
      )}

      <div className="relative max-w-md mb-6">
        <Input
          placeholder="Search by name, company, code, contact..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-full"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No customers yet. Add your first customer to set their discount.</p>
        </div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-heading">Code</th>
                <th className="px-4 py-3 font-heading">Name</th>
                <th className="px-4 py-3 font-heading">Company</th>
                <th className="px-4 py-3 font-heading">Contact</th>
                <th className="px-4 py-3 font-heading text-right">Discount</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-3 font-mono text-xs">{c.customer_code}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.company || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-accent">{c.discount ?? 0}%</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setShowForm(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(c)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}