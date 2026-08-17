import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import * as XLSX from 'npm:xlsx@0.18.5';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const clean = (value: unknown) => value == null ? '' : String(value).trim();

function categoryFromSku(sku = '', description = '') {
  const value = `${sku} ${description}`.toUpperCase();
  if (sku.startsWith('3') || /KIDS|CHILDREN|JUNIOR/.test(value)) return 'kids';
  if (value.includes('BASKETBALL')) return 'basketball';
  if (value.includes('RUNNING')) return 'running';
  if (/TRAINING|TRANING/.test(value)) return 'training';
  if (/LIFESTYLE|CASUAL|SPORT FASHION/.test(value)) return 'lifestyle';
  if (/ACCESSOR|CAP|SOCK|BAG|BALL|HEADBAND|TOWEL/.test(value)) return 'accessories';
  if (/APPAREL|CLOTHING|TEE|SHIRT|JACKET|PANTS|SHORT|POLO|SKIRT|HOODIE|VEST|TRACKSUIT|WOVEN|KNIT/.test(value)) return 'apparel';
  return null;
}
function genderFromSku(sku = '') {
  if (sku.startsWith('3')) return null;
  if (sku.startsWith('81') || sku.startsWith('85')) return 'mens';
  if (sku.startsWith('82') || sku.startsWith('86')) return 'womans';
  return null;
}
function matchCustomer(customers: any[], key: string) {
  const normalized = key.trim().toLowerCase();
  return customers.find((c) => [c.customer_code, c.contact, c.name, c.company].some((v) => clean(v).toLowerCase() === normalized));
}

async function parseWorkbook(fileUrl: string) {
  const response = await fetch(fileUrl);
  if (!response.ok) throw new Error(`Could not download spreadsheet (${response.status})`);
  const workbook = XLSX.read(await response.arrayBuffer(), { type: 'array' });
  return workbook.SheetNames.flatMap((name) => XLSX.utils.sheet_to_json(workbook.Sheets[name], { defval: '' })) as Record<string, any>[];
}

async function gemini(prompt: string) {
  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) throw new Error('GEMINI_API_KEY is not configured. Product web enrichment is optional.');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
  const result = await response.json();
  return JSON.parse(result?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const publishable = Deno.env.get('SUPABASE_ANON_KEY')!;
    const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authorization = req.headers.get('Authorization') || '';
    const userClient = createClient(url, publishable, { global: { headers: { Authorization: authorization } } });
    const admin = createClient(url, secret);
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: 'Unauthorized' }, 401);
    const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const isAdmin = profile?.role === 'admin';
    const { action, payload = {} } = await req.json();

    if (action === 'lookupCustomer' || action === 'priceOrder') {
      const { data: customers, error } = await admin.from('customers').select('*').limit(5000);
      if (error) throw error;
      const key = clean(action === 'lookupCustomer' ? payload.key : payload.code).toLowerCase();
      const customer = key ? matchCustomer(customers || [], key) : null;
      if (action === 'lookupCustomer') return json(customer ? { found: true, name: customer.name, company: customer.company, contact: customer.contact, discount: customer.discount ?? 0 } : { found: false });
      const discount = Number(customer?.discount) || 0;
      let exVatTotal = 0, rrpTotal = 0;
      const pricedLines = (Array.isArray(payload.lines) ? payload.lines : []).map((line: any) => {
        const rrp = Number(line.rrp) || 0, qty = Number(line.qty) || 0, unitEx = rrp * (1 - discount / 100), lineTotal = unitEx * qty;
        exVatTotal += lineTotal; rrpTotal += rrp * qty;
        return { ...line, qty, rrp, discount, wholesaleExVat: +unitEx.toFixed(2), lineTotalExVat: +lineTotal.toFixed(2) };
      });
      const vat = exVatTotal * 0.15;
      return json({ found: Boolean(customer), customerName: customer?.name || '', discount, pricedLines, totals: { rrpTotal: +rrpTotal.toFixed(2), exVatTotal: +exVatTotal.toFixed(2), vat: +vat.toFixed(2), inclTotal: +(exVatTotal + vat).toFixed(2) } });
    }

    if (!isAdmin) return json({ error: 'Admin only' }, 403);

    if (action === 'importProductsBatch') {
      const skus = [...new Set((payload.skus || []).map(clean).filter(Boolean))];
      const { data: existing, error } = await admin.from('products').select('*').in('sku', skus);
      if (error) throw error;
      const bySku = new Map((existing || []).map((p) => [p.sku, p]));
      const rows = skus.map((sku) => {
        const old: any = bySku.get(sku);
        return { id: old?.id, sku, name: old?.name || sku, category: old?.category || categoryFromSku(sku), gender: old?.gender || genderFromSku(sku), status: old?.status || 'active', featured: old?.featured || false };
      });
      const { error: upsertError } = await admin.from('products').upsert(rows, { onConflict: 'sku' });
      if (upsertError) throw upsertError;
      return json({ success: true, total: skus.length, imported: skus.length - bySku.size, updated: bySku.size, skipped: 0, failed: 0, failedItems: [] });
    }

    if (action === 'attachProductImages') {
      const updates = payload.updates || [];
      const skus = updates.map((u: any) => u.sku);
      const { data: products } = await admin.from('products').select('id,sku,images').in('sku', skus);
      const bySku = new Map((products || []).map((p) => [p.sku, p]));
      let updated = 0, skipped = 0;
      for (const item of updates) {
        const product: any = bySku.get(item.sku);
        if (!product) { skipped++; continue; }
        const images = [...new Set([...(product.images || []), ...(item.imageUrls || [])].filter(Boolean))];
        if (images.length === (product.images || []).length) { skipped++; continue; }
        const { error } = await admin.from('products').update({ images }).eq('id', product.id);
        if (error) throw error; updated++;
      }
      return json({ success: true, total: updates.length, updated, skipped, failed: 0, failedItems: [] });
    }

    if (action === 'assignCategoriesFromSku' || action === 'bulkReassignCategories') {
      const offset = Number(payload.offset ?? payload.skip ?? 0), limit = 50;
      const { data: products, error } = await admin.from('products').select('*').order('created_at', { ascending: false }).range(offset, offset + limit - 1);
      if (error) throw error;
      let updated = 0;
      for (const product of products || []) {
        const fields: any = {};
        const category = categoryFromSku(product.sku, product.description), gender = genderFromSku(product.sku);
        if (category && category !== product.category) fields.category = category;
        if (gender !== product.gender) fields.gender = gender;
        if (Object.keys(fields).length) { const { error } = await admin.from('products').update(fields).eq('id', product.id); if (error) throw error; updated++; }
      }
      return json({ success: true, updated, skipped: (products || []).length - updated, processed: (products || []).length, hasMore: (products || []).length === limit, nextOffset: offset + (products || []).length, nextSkip: offset + limit });
    }

    if (action === 'importStock') {
      const rows = await parseWorkbook(payload.file_url);
      const skus = rows.map((r) => clean(r.SKU) || clean(r['Item No_'])).filter(Boolean);
      const { data: products } = await admin.from('products').select('id,sku').in('sku', skus);
      const bySku = new Map((products || []).map((p) => [p.sku, p]));
      const skip = new Set(['sku','season','year','global dimension 1 code','product group code','item category code','long description','closure','sku name','outsole','product type','product sub-type','product sub type','colour','color','material','short description','short description 2','features','rrp','uom','grand total','no_']);
      let updated = 0, unmatched = 0, totalUnits = 0;
      for (const row of rows) {
        const sku = clean(row.SKU) || clean(row['Item No_']), product: any = bySku.get(sku);
        if (!product) { unmatched++; continue; }
        const stock: Record<string, number> = {}; let rowTotal = 0;
        for (const [key, value] of Object.entries(row)) { if (skip.has(key.trim().toLowerCase())) continue; const qty = Number(value); if (Number.isFinite(qty) && qty > 0) { stock[key.trim()] = qty; rowTotal += qty; } }
        const grand = Number(row['Grand Total']); const total_stock = Number.isFinite(grand) && grand > 0 ? grand : rowTotal; totalUnits += total_stock;
        const priceKey = Object.keys(row).find((k) => k.trim().toLowerCase().startsWith('rrp')); const price = priceKey ? Number(row[priceKey]) : 0;
        const { error } = await admin.from('products').update({ stock, total_stock, ...(price > 0 ? { price } : {}) }).eq('id', product.id);
        if (error) throw error; updated++;
      }
      return json({ rows: rows.length, matched: updated, updated, unmatched, total_units: totalUnits, message: `Updated stock for ${updated} products (${totalUnits} units)` });
    }

    if (action === 'importEcomDescriptions') {
      const rows = await parseWorkbook(payload.file_url);
      const { data: products } = await admin.from('products').select('*').limit(10000);
      const bySku = new Map((products || []).map((p) => [p.sku, p]));
      let updated = 0, created = 0, matched = 0;
      for (const row of rows) {
        const sku = clean(row['Item No_']) || clean(row.SKU); if (!sku) continue;
        const old: any = bySku.get(sku);
        const description = clean(row['Product description E-com']) || clean(row['E-Comm']) || clean(row['Short Description 2']) || clean(row['Short Description']) || clean(row['Long Description']);
        const colors = clean(row.Colour).split('/').map((v) => v.trim()).filter(Boolean);
        const gender = ({ MEN: 'mens', WOMEN: 'womans', WOMANS: 'womans' } as Record<string,string>)[clean(row['Product Group Code'])] || genderFromSku(sku);
        const value: any = { sku, name: clean(row['SKU NAME']) || clean(row['Long Description']) || old?.name || sku, description: description || old?.description || null, colors: colors.length ? colors : old?.colors || [], gender: gender || old?.gender || null, category: categoryFromSku(sku, [row.Closure,row['Product Type'],row['Product Sub-Type'],row['Long Description']].map(clean).join(' ')) || old?.category || null, status: 'active' };
        const { error } = await admin.from('products').upsert(value, { onConflict: 'sku' }); if (error) throw error;
        if (old) { matched++; updated++; } else created++;
      }
      return json({ total_rows: rows.length, products_in_db: (products || []).length, matched, updated, unmatched: created, created });
    }

    if (action === 'enrichProducts' || action === 'fetchProductImages') {
      let query = admin.from('products').select('*').order('created_at', { ascending: false });
      if (action === 'enrichProducts') query = query.in('id', payload.productIds || []);
      else query = query.limit(Math.min(Number(payload.limit) || 50, 200));
      const { data: products, error } = await query; if (error) throw error;
      let updated = 0, failed = 0, skipped = 0;
      for (const product of products || []) {
        if (action === 'fetchProductImages' && product.images?.length && !payload.refetch_all && !payload.refetch_existing) { skipped++; continue; }
        try {
          const result = await gemini(`Search the web for ANTA product SKU ${product.sku}. Return JSON with name, description, price_zar, image_url, colors (array), sizes (array). Use null for unknown values. The image must be a direct product-only image URL.`);
          const fields: any = {};
          if (action === 'fetchProductImages') { if (result.image_url) fields.images = [result.image_url, ...(product.images || []).filter((u: string) => u !== result.image_url)]; }
          else {
            if (result.name && (!product.name || product.name === product.sku)) fields.name = result.name;
            if (result.description && !product.description) fields.description = result.description;
            if (result.price_zar && !product.price) fields.price = result.price_zar;
            if (result.image_url && !product.images?.length) fields.images = [result.image_url];
            if (result.colors?.length && !product.colors?.length) fields.colors = result.colors;
            if (result.sizes?.length && !product.sizes?.length) fields.sizes = result.sizes;
          }
          if (Object.keys(fields).length) { const { error } = await admin.from('products').update(fields).eq('id', product.id); if (error) throw error; updated++; } else skipped++;
        } catch { failed++; }
      }
      return json(action === 'fetchProductImages' ? { updated, failed, scanned: (products || []).length, message: `Fetched images for ${updated}/${(products || []).length} products` } : { success: true, enriched: updated, failed, skipped });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
