import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function EcomSheetUpload() {
  const [file, setFile] = useState(null);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);

  const run = async (e) => {
    e.preventDefault();
    if (!file) { toast.error("Select an Excel file"); return; }
    setRunning(true);
    setResults(null);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importEcomDescriptions", { file_url });
      setResults(res.data);
      toast.success(`Updated ${res.data.updated || 0} · created ${res.data.created || 0} products`);
    } catch (err) {
      toast.error(err.message || "Import failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={run} className="space-y-6">
        <div className="border-2 border-dashed border-border rounded-xl p-8">
          <label className="flex flex-col items-center justify-center cursor-pointer">
            <FileSpreadsheet className="w-8 h-8 text-muted-foreground mb-2" />
            <span className="font-heading font-semibold">Drop e-comm Excel here</span>
            <span className="text-sm text-muted-foreground mt-1">.xlsx / .xls — descriptions, colours, gender, category</span>
            <input type="file" accept=".xlsx,.xls" onChange={e => setFile(e.target.files?.[0])} className="hidden" disabled={running} />
          </label>
          {file && <div className="mt-3 text-sm text-accent font-medium text-center">✓ {file.name}</div>}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          <p className="font-semibold mb-1">What this does</p>
          <p className="text-xs text-blue-700">
            Matches each row's Item No_/SKU to a catalogue product and fills in the e-comm description, colour,
            gender and category (and name if missing). Unmatched SKUs are created automatically.
          </p>
        </div>

        {running && (
          <div className="bg-secondary rounded-lg p-4 text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="font-heading font-semibold">Uploading &amp; enriching…</span>
          </div>
        )}

        <Button type="submit" disabled={!file || running} className="w-full font-heading">
          {running
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
            : <><Upload className="w-4 h-4 mr-2" />Run E-comm Enrichment</>}
        </Button>
      </form>

      {results && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">{results.updated} products updated</p>
              <p className="text-xs text-green-700">
                {results.created} created · {results.matched} matched of {results.total_rows} rows
              </p>
            </div>
          </div>
          {results.unmatched > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">{results.unmatched} rows unmatched</p>
                <p className="text-xs text-amber-700">Those rows were created as new products.</p>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}