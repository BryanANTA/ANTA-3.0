import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Trash2, Image, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ProductForm from "@/components/catalogue/ProductForm";

export default function ManageProducts() {
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [search, setSearch] = useState("");
  const [fetchingImages, setFetchingImages] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ current: 0, total: 0 });
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    },
  });

  const filtered = products.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q);
  });

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["products"] });
    setShowForm(false);
    setEditingProduct(null);
  };

  const statusColors = {
    active: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
    archived: "bg-gray-100 text-gray-800",
  };

  const bulkReassign = async () => {
    setReassigning(true);
    let offset = 0;
    let totalUpdated = 0;
    try {
      while (true) {
        const res = await base44.functions.invoke('assignCategoriesFromSku', { offset });
        totalUpdated += res.data.updated || 0;
        if (!res.data.hasMore) break;
        offset = res.data.nextOffset;
        await new Promise(r => setTimeout(r, 1500));
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Categories assigned: ${totalUpdated} products updated`);
    } catch (err) {
      toast.error(`Failed at offset ${offset}: ${err.message}`);
    } finally {
      setReassigning(false);
    }
  };

  const enrichMissingProducts = async () => {
    // Products that are missing name, description, price, or images
    const toEnrich = products.filter(p =>
      (p.name === p.sku || !p.name) ||
      !p.description ||
      !p.price ||
      !p.images?.length
    );

    if (!toEnrich.length) {
      toast.info("All products are already enriched");
      return;
    }

    const BATCH = 5;
    setEnriching(true);
    setEnrichProgress({ current: 0, total: toEnrich.length });

    let totalEnriched = 0;

    for (let i = 0; i < toEnrich.length; i += BATCH) {
      const batch = toEnrich.slice(i, i + BATCH);
      try {
        const res = await base44.functions.invoke("enrichProducts", {
          productIds: batch.map(p => p.id),
        });
        totalEnriched += res.data.enriched || 0;
      } catch (err) {
        toast.error(`Batch failed: ${err.message}`);
        break;
      }
      setEnrichProgress({ current: Math.min(i + BATCH, toEnrich.length), total: toEnrich.length });
    }

    setEnriching(false);
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast.success(`Enriched ${totalEnriched} products with data from the internet`);
  };

  const fetchMissingImages = async () => {
    setFetchingImages(true);
    let totalUpdated = 0;
    let totalFailed = 0;
    try {
      const LIMIT = 100;
      let guard = 0;
      while (guard++ < 100) {
        const res = await base44.functions.invoke("fetchProductImages", { limit: LIMIT });
        totalUpdated += res.data.updated || 0;
        totalFailed += res.data.failed || 0;
        queryClient.invalidateQueries({ queryKey: ["products"] });
        if (!res.data.updated) break;
        if ((res.data.scanned || 0) < LIMIT) break;
      }
      if (totalUpdated > 0) {
        toast.success(`Fetched images for ${totalUpdated} products${totalFailed ? ` · ${totalFailed} failed` : ""}`);
      } else {
        toast.info("No new images could be fetched");
      }
    } catch (err) {
      toast.error(err.message || "Image fetch failed");
    } finally {
      setFetchingImages(false);
      queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl tracking-tight">Manage Products</h1>
          <p className="text-muted-foreground mt-1">Add and manage your ANTA product catalogue</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={enrichMissingProducts}
            disabled={enriching}
            variant="outline"
            className="font-heading"
          >
            {enriching ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enriching {enrichProgress.current}/{enrichProgress.total}...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />Enrich from Web</>
            )}
          </Button>
          <Button
            onClick={bulkReassign}
            disabled={reassigning}
            variant="outline"
            className="font-heading"
          >
            {reassigning ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reassigning...</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" />Fix Categories</>
            )}
          </Button>
          <Button
            onClick={fetchMissingImages}
            disabled={fetchingImages}
            variant="outline"
            className="font-heading"
          >
            {fetchingImages ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Image className="w-4 h-4 mr-2" />
                Fetch Images
              </>
            )}
          </Button>
          <Button onClick={() => { setEditingProduct(null); setShowForm(true); }} className="font-heading">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <ProductForm
              product={editingProduct}
              onSaved={handleSaved}
              onCancel={() => { setShowForm(false); setEditingProduct(null); }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative max-w-sm mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-20 bg-secondary rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground mb-4">
          Total: {products.length} products {search && `(${filtered.length} matching)`}
        </p>
      )}
      {isLoading ? null : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-heading font-semibold">No products yet</p>
          <p className="text-sm mt-1">Click "Add Product" to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-4 bg-card border border-border rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="w-14 h-14 flex-shrink-0 bg-secondary rounded-lg overflow-hidden">
                {product.images?.[0] ? (
                  <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-semibold truncate">{product.name}</h3>
                  <Badge className={`${statusColors[product.status] || statusColors.draft} text-xs border-0`}>
                    {product.status || "draft"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {product.sku}
                  {product.gender && <span className="ml-3 capitalize">• {product.gender}</span>}
                  {product.category && <span className="ml-3 capitalize">• {product.category}</span>}
                  {product.description && <span className="ml-3">• {product.description}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(product.id)} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}