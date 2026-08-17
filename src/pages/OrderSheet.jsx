import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import OrderProductCard from "@/components/order/OrderProductCard";
import OrderSummary from "@/components/order/OrderSummary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function OrderSheet() {
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState({});
  const [customer, setCustomer] = useState({ name: "", contact: "", company: "", notes: "" });
  const [customerCode, setCustomerCode] = useState("");
  const [discount, setDiscount] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products-order"],
    queryFn: () => base44.entities.Product.list("-created_date", 10000),
  });

  const lookupCustomer = async (key) => {
    const res = await base44.functions.invoke("lookupCustomer", { key });
    return res.data;
  };

  const available = products.filter(
    (p) => p.status === "active" && (p.total_stock > 0 || Object.values(p.stock || {}).some((q) => q > 0))
  );
  const q = search.toLowerCase();
  const filtered = available.filter(
    (p) => !search || p.sku?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q)
  );

  const add = (product, size) => {
    const k = `${product.sku}|${size}`;
    setOrder((prev) => {
      const cur = prev[k]?.qty || 0;
      const max = product.stock?.[size] || 0;
      if (cur >= max) {
        toast.error("That's all the available stock");
        return prev;
      }
      return { ...prev, [k]: { product, size, qty: cur + 1 } };
    });
  };
  const dec = (product, size) => {
    const k = `${product.sku}|${size}`;
    setOrder((prev) => {
      const cur = prev[k]?.qty || 0;
      if (cur <= 1) {
        const { [k]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [k]: { ...prev[k], qty: cur - 1 } };
    });
  };
  const clear = () => setOrder({});

  const VAT = 0.15;
  const d = Number(discount) || 0;
  const lineCount = Object.keys(order).length;
  const totalUnits = Object.values(order).reduce((s, l) => s + l.qty, 0);
  const exVatTotal = Object.values(order).reduce(
    (s, l) => s + (l.product.price || 0) * (1 - d / 100) * l.qty, 0
  );

  const exportExcel = async () => {
    const lines = Object.values(order);
    if (!lines.length) {
      toast.error("Add items to your order first");
      return;
    }
    if (!customerCode.trim()) {
      toast.error("Enter your customer code so your discount is applied");
      return;
    }
    setExporting(true);
    try {
      const res = await base44.functions.invoke("priceOrder", {
        code: customerCode,
        lines: lines.map((l) => ({
          sku: l.product.sku,
          name: l.product.name || l.product.sku,
          category: l.product.category || "",
          size: l.size,
          qty: l.qty,
          rrp: l.product.price || 0,
        })),
      });
      const data = res.data;
      if (data?.error) throw new Error(data.error);
      const t = data.totals;
      const aoa = [
        ["ANTA Order Sheet"],
        ["Date", new Date().toLocaleString()],
        ["Customer", customer.name],
        ["Customer code", customerCode],
        ["Company", customer.company],
        ["Contact", customer.contact],
        ["Discount %", data.discount],
        ["VAT rate", "15%"],
        ["Notes", customer.notes],
        [],
        ["SKU", "Product Name", "Category", "Size (US)", "Qty", "RRP (ZAR)", "Discount %", "Wholesale ex VAT (ZAR)", "Line Total ex VAT (ZAR)"],
        ...data.pricedLines.map((l) => [l.sku, l.name, l.category, l.size, l.qty, l.rrp, l.discount, l.wholesaleExVat, l.lineTotalExVat]),
        [],
        ["", "", "", "", "", "", "", "TOTAL ex VAT", t.exVatTotal],
        ["", "", "", "", "", "", "", "VAT (15%)", t.vat],
        ["", "", "", "", "", "", "", "TOTAL incl VAT", t.inclTotal],
      ];
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws["!cols"] = [{ wch: 14 }, { wch: 32 }, { wch: 14 }, { wch: 10 }, { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 18 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Order");
      XLSX.writeFile(wb, `anta-order-${(customerCode || "customer").replace(/\s+/g, "_")}-${Date.now()}.xlsx`);
      toast.success("Order exported — send it to us!");
      setMobileOpen(false);
    } catch (e) {
      toast.error(e.message || "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const summary = (
    <OrderSummary
      order={order}
      customer={customer}
      setCustomer={setCustomer}
      onExport={exportExcel}
      onClear={clear}
      onInc={add}
      onDec={dec}
      exporting={exporting}
      discount={discount}
      setDiscount={setDiscount}
      onLookup={lookupCustomer}
      customerCode={customerCode}
      setCustomerCode={setCustomerCode}
    />
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8 lg:grid lg:grid-cols-[1fr_22rem] lg:gap-8">
      <div>
        <div className="mb-6">
          <h1 className="font-heading font-bold text-3xl tracking-tight">Order Sheet</h1>
          <p className="text-muted-foreground mt-1">Build your order from available stock, then export to Excel.</p>
        </div>
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full"
          />
        </div>
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="aspect-[3/4] bg-secondary rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center py-16 text-muted-foreground">No available products match.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {filtered.slice(0, 300).map((p, i) => (
                <OrderProductCard key={p.id} product={p} index={i} order={order} onAdd={add} onDec={dec} />
              ))}
            </div>
            {filtered.length > 300 && (
              <p className="text-xs text-muted-foreground mt-4 text-center">
                Showing first 300 of {filtered.length} available products — refine your search.
              </p>
            )}
          </>
        )}
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block sticky top-24 self-start">
        <div className="bg-card border border-border rounded-2xl p-4">{summary}</div>
      </aside>

      {/* Mobile bar */}
      <div className="lg:hidden fixed bottom-4 inset-x-4 z-40 bg-card border border-border rounded-2xl shadow-lg p-3 flex items-center justify-between">
        <span className="font-heading font-semibold text-sm">
          {totalUnits} items · R{exVatTotal.toFixed(2)} ex VAT
        </span>
        <button
          onClick={() => setMobileOpen(true)}
          className="bg-accent text-accent-foreground rounded-lg px-4 py-2 text-sm font-heading font-semibold flex items-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" /> Review ({lineCount})
        </button>
      </div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading">Review your order</DialogTitle>
          </DialogHeader>
          {summary}
        </DialogContent>
      </Dialog>
    </div>
  );
}