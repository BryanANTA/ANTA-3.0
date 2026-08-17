import React, { useState, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageUp, Loader2, CheckCircle2, AlertCircle, FolderOpen, Images } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const IMAGE_EXTS = /\.(jpg|jpeg|png|webp|gif)$/i;
const CONCURRENCY = 4;

function extractSku(file, lookup) {
  const relPath = file.webkitRelativePath || file.name;
  const parts = relPath.split(/[/\\]/).filter(Boolean);
  const filename = parts[parts.length - 1] || file.name;
  const base = filename.replace(IMAGE_EXTS, "");

  // lookup resolves a candidate (incl. regional leading-digit variants) to the canonical SKU
  const hit = (cand) => lookup.get(cand) || null;

  // 1. exact filename match
  let canon = hit(base);
  if (canon) return canon;

  // 2. strip trailing image-index suffix (-N or _N)
  const stripped = base.replace(/[-_]\d+$/, "");
  if (stripped !== base) { canon = hit(stripped); if (canon) return canon; }

  // 3. walk token-prefixes of the filename (longest first), joining with - or _
  //    handles "312039901-1-front.jpg" -> "312039901-1", "312039901-1_2.jpg" -> "312039901-1"
  const tokens = base.split(/[-_]/);
  for (let n = tokens.length - 1; n >= 1; n--) {
    canon = hit(tokens.slice(0, n).join("-"));
    if (canon) return canon;
    canon = hit(tokens.slice(0, n).join("_"));
    if (canon) return canon;
  }

  // 4. fallback: folder segment matches a SKU (innermost parent outward)
  for (let i = parts.length - 2; i >= 0; i--) {
    canon = hit(parts[i]);
    if (canon) return canon;
  }

  return null;
}

export default function ImageUpload() {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ uploaded: 0, total: 0, attached: 0 });
  const [results, setResults] = useState(null);
  const folderInputRef = useRef(null);
  const filesInputRef = useRef(null);

  const addFiles = (incoming) => {
    const imgs = incoming.filter(f => IMAGE_EXTS.test(f.name) && f.type.startsWith("image/"));
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.webkitRelativePath || f.name));
      const deduped = imgs.filter(f => !existing.has(f.webkitRelativePath || f.name));
      return [...prev, ...deduped];
    });
    setResults(null);
  };

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products-all-for-images'],
    queryFn: async () => {
      const all = [];
      let offset = 0;
      while (true) {
        const batch = await base44.entities.Product.list('-created_date', 500, offset);
        all.push(...batch);
        if (batch.length < 500) break;
        offset += 500;
      }
      return all;
    }
  });

  const skuSet = useMemo(() => new Set((products || []).map(p => p.sku).filter(Boolean)), [products]);

  // Regional leading-digit variants (1/8/3 are regional codes for the same product).
  // Exact SKU always wins; variants only fill in gaps so a filename like "112039901-1"
  // matches the catalogue SKU "812039901-1".
  const skuLookup = useMemo(() => {
    const map = new Map();
    const REGION_DIGITS = ['1', '8', '3'];
    for (const sku of skuSet) map.set(sku, sku);
    for (const sku of skuSet) {
      if (!/^\d/.test(sku)) continue;
      const rest = sku.slice(1);
      for (const d of REGION_DIGITS) {
        if (d === sku[0]) continue;
        const variant = d + rest;
        if (!map.has(variant)) map.set(variant, sku);
      }
    }
    return map;
  }, [skuSet]);

  const grouped = useMemo(() => {
    const map = new Map();
    const unmatched = [];
    for (const f of files) {
      const sku = extractSku(f, skuLookup);
      if (sku) {
        if (!map.has(sku)) map.set(sku, { sku, files: [] });
        map.get(sku).files.push(f);
      } else {
        unmatched.push(f);
      }
    }
    return { matched: Array.from(map.values()), unmatched };
  }, [files, skuSet]);

  const handleFolderSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    if (selected.length) toast.info(`Added ${selected.length} files from folder`);
    e.target.value = "";
  };

  const handleFilesSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    addFiles(selected);
    if (selected.length) toast.info(`Added ${selected.length} files`);
    e.target.value = "";
  };

  const runUpload = async () => {
    if (!grouped.matched.length) { toast.error("No matching images"); return; }
    setUploading(true);
    setResults(null);

    const allFiles = grouped.matched.flatMap(g => g.files.map(f => ({ file: f, sku: g.sku })));
    setProgress({ uploaded: 0, total: allFiles.length, attached: 0 });

    const skuToUrls = new Map();
    let idx = 0;
    let uploaded = 0;

    async function worker() {
      while (idx < allFiles.length) {
        const cur = idx++;
        const { file, sku } = allFiles[cur];
        try {
          const { file_url } = await base44.integrations.Core.UploadFile({ file });
          if (!skuToUrls.has(sku)) skuToUrls.set(sku, []);
          skuToUrls.get(sku).push(file_url);
        } catch (err) {
          // skip failed file
        }
        uploaded++;
        setProgress({ uploaded, total: allFiles.length, attached: 0 });
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker));

    const updates = Array.from(skuToUrls.entries()).map(([sku, imageUrls]) => ({ sku, imageUrls }));
    try {
      const res = await base44.functions.invoke("attachProductImages", { updates });
      setProgress({ uploaded, total: allFiles.length, attached: res.data.updated || 0 });
      setResults({
        matched: grouped.matched.length,
        unmatched: grouped.unmatched.length,
        uploaded: allFiles.length,
        attached: res.data.updated || 0,
        skipped: res.data.skipped || 0,
        failed: res.data.failed || 0,
        failedItems: res.data.failedItems || [],
      });
      toast.success(`Attached images to ${res.data.updated || 0} products`);
    } catch (err) {
      toast.error(`Attach failed: ${err.message}`);
    }
    setUploading(false);
  };

  const pct = progress.total ? (progress.uploaded / progress.total) * 100 : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl tracking-tight">Upload Product Images</h1>
        <p className="text-muted-foreground mt-2">
          Select a folder of images — each image's filename is matched to a product SKU automatically.
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="font-heading">Select Image Folder</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center space-y-4">
            <input
              ref={folderInputRef}
              type="file"
              // @ts-ignore — non-standard but widely supported attributes
              webkitdirectory=""
              multiple
              onChange={handleFolderSelect}
              className="hidden"
              disabled={uploading}
            />
            <input
              ref={filesInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleFilesSelect}
              className="hidden"
              disabled={uploading}
            />
            <Images className="w-8 h-8 text-muted-foreground mx-auto mb-1" />
            <p className="text-sm text-muted-foreground mb-3">
              Add images from a folder (matched by folder name) or pick individual files (matched by filename).
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => folderInputRef.current?.click()}
                disabled={uploading || productsLoading}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Choose Folder
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => filesInputRef.current?.click()}
                disabled={uploading || productsLoading}
              >
                <ImageUp className="w-4 h-4 mr-2" />
                Choose Files
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
            <p className="font-semibold mb-1">Filename → SKU matching</p>
            <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
              <li>The SKU is read from each image's filename (extension stripped).</li>
              <li><code className="font-mono">312039901-1.jpg</code> → SKU <code className="font-mono">312039901-1</code></li>
              <li><code className="font-mono">312039901-1_2.jpg</code> → SKU <code className="font-mono">312039901-1</code> (2nd image)</li>
              <li><code className="font-mono">312039901-1-front.jpg</code> → SKU <code className="font-mono">312039901-1</code> (label suffix ignored)</li>
              <li>Regional leading digits <code className="font-mono">1</code> / <code className="font-mono">8</code> / <code className="font-mono">3</code> are treated as the same SKU — e.g. <code className="font-mono">112039901-1.jpg</code> matches SKU <code className="font-mono">812039901-1</code>.</li>
              <li>Fallback: if no SKU is found in the filename, the parent folder name is checked.</li>
              <li>Multiple images for the same SKU are appended to its gallery (no duplicates).</li>
            </ul>
          </div>

          {files.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-2xl font-heading font-bold">{files.length}</p>
                <p className="text-xs text-muted-foreground">Images found</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-2xl font-heading font-bold text-green-700">{grouped.matched.length}</p>
                <p className="text-xs text-green-700">Products matched</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-2xl font-heading font-bold text-red-700">{grouped.unmatched.length}</p>
                <p className="text-xs text-red-700">Unmatched</p>
              </div>
              <div className="bg-secondary rounded-lg p-3">
                <p className="text-2xl font-heading font-bold">{skuSet.size}</p>
                <p className="text-xs text-muted-foreground">SKUs in catalogue</p>
              </div>
            </div>
          )}

          {uploading && (
            <div className="bg-secondary rounded-lg p-4 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-heading font-semibold">
                  {progress.attached > 0
                    ? `Attaching to products… ${progress.attached} done`
                    : `Uploading images… ${progress.uploaded} / ${progress.total}`}
                </span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div
                  className="bg-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.attached > 0 ? 100 : pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={runUpload}
              disabled={!grouped.matched.length || uploading || productsLoading}
              className="flex-1 font-heading"
            >
              {uploading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</>
                : <><ImageUp className="w-4 h-4 mr-2" />Attach {grouped.matched.length} Product{grouped.matched.length !== 1 ? "s" : ""}</>}
            </Button>
            {files.length > 0 && !uploading && (
              <Button variant="outline" onClick={() => setFiles([])} type="button">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {grouped.unmatched.length > 0 && files.length > 0 && !uploading && (
        <Card className="mb-6 border-amber-200">
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              {grouped.unmatched.length} unmatched images
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">
              These filenames didn't match any SKU in the catalogue. First 10:
            </p>
            <div className="font-mono text-xs space-y-0.5 max-h-32 overflow-y-auto">
              {grouped.unmatched.slice(0, 10).map((f, i) => (
                <p key={i}>{f.name}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {results && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Upload Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">{results.attached} products updated</p>
                  <p className="text-xs text-green-700">
                    {results.uploaded} images uploaded · {results.skipped} unchanged
                  </p>
                </div>
              </div>
              {results.unmatched > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-900">{results.unmatched} images couldn't be matched</p>
                    <p className="text-xs text-amber-700">Check filenames match an existing SKU exactly.</p>
                  </div>
                </div>
              )}
              {results.failed > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">{results.failed} failed to attach</p>
                    {results.failedItems?.slice(0, 5).map((item, i) => (
                      <p key={i} className="text-xs text-red-700 font-mono">{item.sku}: {item.error}</p>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
