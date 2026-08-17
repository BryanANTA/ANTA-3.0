import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export default function OrderSummary({ order, customer, setCustomer, onExport, onClear, onInc, onDec, exporting, discount, setDiscount, onLookup, customerCode, setCustomerCode }) {
  const VAT = 0.15;
  const [lookupMsg, setLookupMsg] = useState("");
  const [resolved, setResolved] = useState(false);
  const applyCustomer = async () => {
    const key = (customerCode || "").trim().toLowerCase();
    if (!key) { setResolved(false); setLookupMsg(""); return; }
    setLookupMsg("Looking up...");
    try {
      const match = await onLookup(key);
      if (match?.found) {
        setCustomer({
          ...customer,
          name: customer.name || match.name || "",
          contact: customer.contact || match.contact || "",
          company: customer.company || match.company || "",
        });
        setDiscount(match.discount != null ? String(match.discount) : "0");
        setResolved(true);
        setLookupMsg(`Applied ${match.discount ?? 0}% discount`);
      } else {
        setDiscount("0");
        setResolved(false);
        setLookupMsg("No customer found for that code");
      }
    } catch (e) {
      setLookupMsg("Lookup failed");
    }
  };
  const d = Number(discount) || 0;
  const lines = Object.values(order);
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);
  const unitEx = (l) => {
    const rrp = l.product.price || 0;
    return rrp * (1 - d / 100);
  };
  const exVatTotal = lines.reduce((s, l) => s + unitEx(l) * l.qty, 0);
  const rrpTotal = lines.reduce((s, l) => s + (l.product.price || 0) * l.qty, 0);
  const vatAmount = exVatTotal * VAT;
  const inclTotal = exVatTotal + vatAmount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-lg flex items-center gap-2">
          <ShoppingBag className="w-4 h-4" /> Your Order
        </h3>
        {lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            placeholder="Customer code"
            value={customerCode}
            onChange={(e) => setCustomerCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCustomer(); } }}
          />
          <Button variant="outline" size="sm" onClick={applyCustomer} className="shrink-0">Apply</Button>
        </div>
        {lookupMsg && <p className="text-xs text-muted-foreground px-1">{lookupMsg}</p>}
      </div>

      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No items yet. Tap a size on a product to add it.
        </p>
      ) : (
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {lines.map((l) => (
            <div key={`${l.product.sku}|${l.size}`} className="flex items-center gap-2 bg-secondary rounded-lg p-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{l.product.name || l.product.sku}</p>
                <p className="text-xs text-muted-foreground font-mono">{l.product.sku} · US {l.size}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onDec(l.product, l.size)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{l.qty}</span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onInc(l.product, l.size)}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <span className="text-sm font-semibold w-20 text-right">
                R{(unitEx(l) * l.qty).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">RRP total (incl VAT)</span>
          <span>R{rrpTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Discount %</span>
          <span className="font-medium">{d}% {resolved ? "· your rate" : "· enter customer code"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-heading font-semibold">{totalUnits} units · Wholesale ex VAT</span>
          <span className="font-heading font-bold text-lg">R{exVatTotal.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>VAT (15%)</span>
          <span>R{vatAmount.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Total incl VAT</span>
          <span>R{inclTotal.toFixed(2)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="font-heading text-sm font-semibold">Your details</p>
        <Input placeholder="Name *" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
        <Input placeholder="Email or phone *" value={customer.contact} onChange={(e) => setCustomer({ ...customer, contact: e.target.value })} />
        <Input placeholder="Company (optional)" value={customer.company} onChange={(e) => setCustomer({ ...customer, company: e.target.value })} />
        <Textarea
          placeholder="Notes / delivery instructions"
          rows={2}
          value={customer.notes}
          onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
        />
      </div>

      <Button
        onClick={onExport}
        disabled={!lines.length || exporting}
        className="w-full font-heading bg-accent hover:bg-accent/90 text-accent-foreground"
      >
        <Download className="w-4 h-4 mr-2" /> {exporting ? "Preparing..." : "Export Excel"}
      </Button>
    </div>
  );
}