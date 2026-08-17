import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { base44 } from "@/api/base44Client";
import { X, Upload, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["running", "basketball", "training", "lifestyle", "kids", "accessories"];

export default function ProductForm({ product, onSaved, onCancel }) {
  const [form, setForm] = useState({
    sku: product?.sku || "",
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    price: product?.price || "",
    colors: product?.colors || [],
    sizes: product?.sizes || [],
    featured: product?.featured || false,
    status: product?.status || "active",
    images: product?.images || [],
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      urls.push(file_url);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...urls] }));
    setUploading(false);
  };

  const removeImage = (index) => {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }));
  };

  const addColor = () => {
    if (newColor.trim() && !form.colors.includes(newColor.trim())) {
      setForm((f) => ({ ...f, colors: [...f.colors, newColor.trim()] }));
      setNewColor("");
    }
  };

  const addSize = () => {
    if (newSize.trim() && !form.sizes.includes(newSize.trim())) {
      setForm((f) => ({ ...f, sizes: [...f.sizes, newSize.trim()] }));
      setNewSize("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.sku || !form.name) {
      toast.error("SKU and Name are required");
      return;
    }
    setSaving(true);
    const data = { ...form, price: form.price ? Number(form.price) : undefined };
    if (product) {
      await base44.entities.Product.update(product.id, data);
      toast.success("Product updated");
    } else {
      await base44.entities.Product.create(data);
      toast.success("Product created");
    }
    setSaving(false);
    onSaved?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">{product ? "Edit Product" : "Add Product"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-heading text-xs tracking-wide">SKU *</Label>
              <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="e.g. 112345678" />
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-xs tracking-wide">Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-xs tracking-wide">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-xs tracking-wide">Price (ZAR)</Label>
              <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <Label className="font-heading text-xs tracking-wide">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} />
              <Label className="font-heading text-xs tracking-wide">Featured Product</Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-heading text-xs tracking-wide">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." rows={3} />
          </div>

          {/* Images */}
          <div className="space-y-3">
            <Label className="font-heading text-xs tracking-wide">Images</Label>
            <div className="flex flex-wrap gap-3">
              {form.images.map((url, i) => (
                <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden bg-secondary group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <label className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-accent transition-colors">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
                  <>
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-1">Upload</span>
                  </>
                )}
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
          </div>

          {/* Colors */}
          <div className="space-y-2">
            <Label className="font-heading text-xs tracking-wide">Colors</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.colors.map((c, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-xs font-medium">
                  {c}
                  <button type="button" onClick={() => setForm({ ...form, colors: form.colors.filter((_, j) => j !== i) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="Add color (e.g. Black)" className="max-w-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addColor())} />
              <Button type="button" variant="secondary" size="sm" onClick={addColor}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Sizes */}
          <div className="space-y-2">
            <Label className="font-heading text-xs tracking-wide">Sizes</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.sizes.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 bg-secondary px-3 py-1 rounded-full text-xs font-medium">
                  {s}
                  <button type="button" onClick={() => setForm({ ...form, sizes: form.sizes.filter((_, j) => j !== i) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={newSize} onChange={(e) => setNewSize(e.target.value)} placeholder="Add size (e.g. US 10)" className="max-w-xs" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSize())} />
              <Button type="button" variant="secondary" size="sm" onClick={addSize}><Plus className="w-4 h-4" /></Button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {product ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}