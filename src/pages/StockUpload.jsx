import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Loader2, CheckCircle2, AlertCircle, PackageOpen } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function StockUpload() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Please select the stock Excel file"); return; }

    setImporting(true);
    setResults(null);
    try {
      // 1. Upload the xlsx to get a file_url
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // 2. Run the importer
      const res = await base44.functions.invoke("importStock", { file_url });
      setResults(res.data);
      toast.success(`Stock updated for ${res.data.updated} products`);
    } catch (err) {
      toast.error(err.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl tracking-tight">Stock on Hand</h1>
        <p className="text-muted-foreground mt-2">
          Upload the weekly Free Stock Report to refresh stock per SKU. Sizes are stored in US format.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Upload Stock Sheet</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpload} className="space-y-6">
                <div className="border-2 border-dashed border-border rounded-xl p-8">
                  <label className="flex flex-col items-center justify-center cursor-pointer">
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="font-heading font-semibold">Drop Excel file here</span>
                    <span className="text-sm text-muted-foreground mt-1">.xlsx — one row per SKU with size columns</span>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={e => setFile(e.target.files?.[0])}
                      className="hidden"
                      disabled={importing}
                    />
                  </label>
                  {file && (
                    <div className="mt-3 text-sm text-accent font-medium text-center">✓ {file.name}</div>
                  )}
                </div>

                {importing && (
                  <div className="bg-secondary rounded-lg p-4 text-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-heading font-semibold">Updating stock…</span>
                  </div>
                )}

                <Button type="submit" disabled={!file || importing} className="w-full font-heading">
                  {importing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Update Stock</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg">How it works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">1</span>
              <div>
                <p className="font-semibold">Upload weekly</p>
                <p className="text-muted-foreground text-xs">Drop the latest Free Stock Report .xlsx</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">2</span>
              <div>
                <p className="font-semibold">Match by SKU</p>
                <p className="text-muted-foreground text-xs">Each row updates the matching product</p>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="text-accent font-bold text-lg leading-none">3</span>
              <div>
                <p className="font-semibold">Per-size stock</p>
                <p className="text-muted-foreground text-xs">Quantities stored per size in US format</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {results && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Update Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-semibold text-green-900">{results.updated} products updated</p>
                  <p className="text-xs text-green-700">
                    {results.total_units} units in stock · {results.unmatched} SKUs unmatched
                  </p>
                </div>
              </div>
              {results.unmatched > 0 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {results.unmatched} SKUs in the sheet had no matching product in the catalogue.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!results && !importing && (
        <div className="mt-8 text-center text-muted-foreground">
          <PackageOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No stock uploaded yet for this session.</p>
        </div>
      )}
    </div>
  );
}