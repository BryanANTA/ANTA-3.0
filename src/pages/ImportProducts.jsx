import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import EcomSheetUpload from "@/components/import/EcomSheetUpload";

const BATCH_SIZE = 50;

export default function ImportProducts() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, batches: 0, totalBatches: 0 });
  const [results, setResults] = useState(null);
  const [skuText, setSkuText] = useState("");
  const [activeTab, setActiveTab] = useState("file");

  const downloadTemplate = () => {
    const template = "sku\n312039901-1\n812345678-1";
    const blob = new Blob([template], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "anta-products-template.csv";
    a.click();
  };

  const parseSkusFromCsv = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l);
    if (!lines.length) return [];
    const firstLine = lines[0].toLowerCase();
    const startIdx = firstLine.startsWith("sku") ? 1 : 0;
    const skus = [];
    for (let i = startIdx; i < lines.length; i++) {
      const sku = lines[i].split(",")[0].trim().replace(/^"|"$/g, "");
      if (sku) skus.push(sku);
    }
    return skus;
  };

  const runImport = async (skus) => {
    if (!skus.length) { toast.error("No SKUs found"); return; }

    setImporting(true);
    setResults(null);

    const batches = [];
    for (let i = 0; i < skus.length; i += BATCH_SIZE) {
      batches.push(skus.slice(i, i + BATCH_SIZE));
    }

    setProgress({ current: 0, total: skus.length, batches: 0, totalBatches: batches.length });

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    let totalUpdated = 0;
    const allFailedItems = [];

    for (let b = 0; b < batches.length; b++) {
      try {
        const res = await base44.functions.invoke("importProductsBatch", { skus: batches[b] });
        totalImported += res.data.imported || 0;
        totalSkipped += res.data.skipped || 0;
        totalFailed += res.data.failed || 0;
        totalUpdated += res.data.updated || 0;
        if (res.data.failedItems?.length) allFailedItems.push(...res.data.failedItems);
        setProgress({
          current: Math.min((b + 1) * BATCH_SIZE, skus.length),
          total: skus.length,
          batches: b + 1,
          totalBatches: batches.length,
        });
      } catch (err) {
        totalFailed += batches[b].length;
        toast.error(`Batch ${b + 1} failed: ${err.message}`);
      }
      // Pause between batches to avoid rate limiting
      if (b < batches.length - 1) await new Promise(r => setTimeout(r, 1000));
    }

    setImporting(false);
    setResults({ imported: totalImported, updated: totalUpdated, skipped: totalSkipped, failed: totalFailed, failedItems: allFailedItems });
    toast.success(`Done! ${totalImported} new, ${totalUpdated} updated, ${totalSkipped} unchanged`);
  };

  const handleFileImport = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please select a file"); return; }
    const text = await file.text();
    const skus = parseSkusFromCsv(text);
    toast.info(`Found ${skus.length} SKUs — importing...`);
    await runImport(skus);
  };

  const handlePasteImport = async () => {
    const skus = skuText.split("\n").map(s => s.trim()).filter(s => s);
    await runImport(skus);
  };

  const downloadSkusCsv = () => {
    const skus = skuText.split("\n").map(s => s.trim()).filter(s => s);
    if (!skus.length) { toast.error("No SKUs to download"); return; }
    const csv = "sku\n" + skus.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anta-skus-${Date.now()}.csv`;
    a.click();
    toast.success(`Downloaded ${skus.length} SKUs`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl tracking-tight">Import Products</h1>
        <p className="text-muted-foreground mt-2">Upload a CSV of SKUs to bulk-import into the catalogue</p>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {["file", "paste", "ecom"].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-heading text-sm font-medium transition-colors ${
              activeTab === tab ? "text-accent border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "file" ? "Upload CSV" : tab === "paste" ? "Paste SKUs" : "E-comm Sheet"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === "file" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Upload CSV</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFileImport} className="space-y-6">
                  <div className="border-2 border-dashed border-border rounded-xl p-8">
                    <label className="flex flex-col items-center justify-center cursor-pointer">
                      <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="font-heading font-semibold">Drop CSV file here</span>
                      <span className="text-sm text-muted-foreground mt-1">or click to browse</span>
                      <input type="file" accept=".csv" onChange={e => setFile(e.target.files?.[0])} className="hidden" disabled={importing} />
                    </label>
                    {file && <div className="mt-3 text-sm text-accent font-medium text-center">✓ {file.name}</div>}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
                    <p className="font-semibold mb-1">CSV Format</p>
                    <p className="font-mono text-xs">sku</p>
                    <p className="font-mono text-xs">312039901-1</p>
                    <p className="text-xs mt-2 text-blue-700">One SKU per row. Headers optional. Categories auto-assigned from SKU prefix.</p>
                  </div>

                  {importing && (
                    <div className="bg-secondary rounded-lg p-4 text-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="font-heading font-semibold">Importing… batch {progress.batches}/{progress.totalBatches}</span>
                      </div>
                      <div className="w-full bg-border rounded-full h-2">
                        <div
                          className="bg-accent h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{progress.current} / {progress.total} SKUs</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={downloadTemplate} type="button">
                      <Download className="w-4 h-4 mr-2" />
                      Template
                    </Button>
                    <Button type="submit" disabled={!file || importing} className="flex-1 font-heading">
                      {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><Upload className="w-4 h-4 mr-2" />Import Products</>}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "paste" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">Paste SKUs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Paste one SKU per line..."
                  value={skuText}
                  onChange={e => setSkuText(e.target.value)}
                  className="h-48 font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">{skuText.split("\n").filter(s => s.trim()).length} SKUs detected</p>

                {importing && (
                  <div className="bg-secondary rounded-lg p-4 text-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="font-heading font-semibold">Importing… batch {progress.batches}/{progress.totalBatches}</span>
                    </div>
                    <div className="w-full bg-border rounded-full h-2">
                      <div
                        className="bg-accent h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress.total ? (progress.current / progress.total) * 100 : 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{progress.current} / {progress.total} SKUs</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={downloadSkusCsv} disabled={!skuText.trim()}>
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV
                  </Button>
                  <Button onClick={handlePasteImport} disabled={!skuText.trim() || importing} className="flex-1 font-heading">
                    {importing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing...</> : <><Upload className="w-4 h-4 mr-2" />Import SKUs</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "ecom" && (
            <Card>
              <CardHeader>
                <CardTitle className="font-heading">E-comm Sheet Enrichment</CardTitle>
              </CardHeader>
              <CardContent>
                <EcomSheetUpload />
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">1</span>
              <div>
                <p className="font-semibold">Upload SKUs</p>
                <p className="text-muted-foreground text-xs">CSV with one SKU per row</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">2</span>
              <div>
                <p className="font-semibold">Batch Import</p>
                <p className="text-muted-foreground text-xs">Processed in batches of {BATCH_SIZE} server-side</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">3</span>
              <div>
                <p className="font-semibold">Auto Categories</p>
                <p className="text-muted-foreground text-xs">Kids/mens/womans assigned from SKU prefix</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">4</span>
              <div>
                <p className="font-semibold">Skips Duplicates</p>
                <p className="text-muted-foreground text-xs">Already-imported SKUs are safely skipped</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {results && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Import Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">{results.imported} new products imported</p>
                  <p className="text-xs text-green-700">
                    {results.updated > 0 && <span>{results.updated} existing updated · </span>}
                    {results.skipped} unchanged and skipped
                  </p>
                </div>
              </div>
              {results.failed > 0 && (
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">{results.failed} failed</p>
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