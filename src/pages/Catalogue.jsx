import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, CheckSquare, X, FileDown, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import SelectableProductCard from "@/components/catalogue/SelectableProductCard";
import CategoryFilter from "@/components/catalogue/CategoryFilter";
import ImageStatusFilter from "@/components/catalogue/ImageStatusFilter";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export default function Catalogue() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [imageFilter, setImageFilter] = useState("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data: products = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 10000),
  });

  const filtered = products
    .filter((p) => {
      if (p.status !== "active") return false;
      if (category !== "all" && p.category !== category) return false;
      if (imageFilter === "with" && !(p.images?.length > 0)) return false;
      if (imageFilter === "without" && p.images?.length > 0) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.sku?.toLowerCase().includes(q) ||
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());

  const toggleSelection = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectionMode = () => {
    setSelectionMode((v) => !v);
    setSelectedIds(new Set());
  };

  const selectAll = () => {
    setSelectedIds(new Set(filtered.map((p) => p.id)));
  };

  const exportPdf = async () => {
    const toExport = filtered.filter((p) => selectedIds.has(p.id));
    if (!toExport.length) {
      toast.error("No products selected");
      return;
    }
    setExportingPdf(true);

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;
    const cols = 2;
    const colW = (pageW - margin * 2) / cols;
    const rowH = 80;
    let x = margin;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ANTA Product Catalogue", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleDateString()} — ${toExport.length} products`, margin, y);
    doc.setTextColor(0);
    y += 10;

    let col = 0;

    for (const product of toExport) {
      if (y + rowH > pageH - margin) {
        doc.addPage();
        y = margin;
        col = 0;
        x = margin;
      }

      const cellX = margin + col * colW;

      // Try to load image
      if (product.images?.[0]) {
        try {
          const imgData = await fetchImageAsBase64(product.images[0]);
          if (imgData) {
            doc.addImage(imgData, "JPEG", cellX, y, colW - 6, 45);
          }
        } catch (_) {
          // skip image if it fails
        }
      }

      const textY = y + 48;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(product.name || "", cellX, textY, { maxWidth: colW - 8 });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(`SKU: ${product.sku}`, cellX, textY + 5);
      doc.setTextColor(0);

      if (product.price) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(`R${product.price.toFixed(2)}`, cellX, textY + 10);
      }

      if (product.category) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(130);
        doc.text(product.category.toUpperCase(), cellX, textY + 15);
        doc.setTextColor(0);
      }

      col++;
      if (col >= cols) {
        col = 0;
        y += rowH;
        x = margin;
      }
    }

    doc.save(`anta-catalogue-${Date.now()}.pdf`);
    setExportingPdf(false);
    toast.success("PDF exported!");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4"
      >
        <div>
          <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight">
            Product Catalogue
          </h1>
          <p className="text-muted-foreground mt-2 font-body">
            Browse the ANTA collection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            className="font-heading gap-2"
          >
            <CheckSquare className="w-4 h-4" />
            {selectionMode ? "Cancel" : "Select"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="font-heading gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <div className="space-y-4 mb-8">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-full bg-card border-border"
          />
        </div>
        <CategoryFilter
          active={category}
          onChange={setCategory}
          counts={Object.fromEntries(
            ["all", "running", "basketball", "training", "lifestyle", "apparel", "kids", "accessories"].map(c => [
              c,
              c === "all"
                ? products.filter(p => p.status === "active").length
                : products.filter(p => p.status === "active" && p.category === c).length
            ])
          )}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <ImageStatusFilter
            active={imageFilter}
            onChange={setImageFilter}
            counts={{
              all: products.filter(p => p.status === "active").length,
              with: products.filter(p => p.status === "active" && p.images?.length > 0).length,
              without: products.filter(p => p.status === "active" && !(p.images?.length > 0)).length,
            }}
          />
        </div>
      </div>

      {/* Selection toolbar */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 flex flex-wrap items-center gap-3 bg-card border border-border rounded-xl px-4 py-3"
          >
            <span className="font-heading text-sm font-semibold">
              {selectedIds.size} selected
            </span>
            <Button variant="outline" size="sm" onClick={selectAll} className="font-heading">
              Select All ({filtered.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={selectedIds.size === 0}
              className="font-heading"
            >
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
            <Button
              size="sm"
              onClick={exportPdf}
              disabled={selectedIds.size === 0 || exportingPdf}
              className="font-heading ml-auto bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              {exportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              Export PDF
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {Array(8)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-3 animate-pulse">
                <div className="aspect-square bg-secondary rounded-2xl" />
                <div className="h-3 bg-secondary rounded w-16" />
                <div className="h-4 bg-secondary rounded w-32" />
                <div className="h-5 bg-secondary rounded w-20" />
              </div>
            ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-heading font-semibold text-lg mb-1">No products found</h3>
          <p className="text-muted-foreground text-sm">
            {search || category !== "all"
              ? "Try adjusting your search or filters"
              : "Add products from the Manage Products page"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((product, index) => (
            <SelectableProductCard
              key={product.id}
              product={product}
              index={index}
              selectionMode={selectionMode}
              selected={selectedIds.has(product.id)}
              onToggle={toggleSelection}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}