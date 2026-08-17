import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !publishableKey) throw new Error('Missing Supabase environment variables');

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

const tableNames = { Product: 'products', Customer: 'customers' };

function entityApi(entityName) {
  const table = tableNames[entityName];
  return {
    async list(sort = '-created_date', limit = 10000, offset = 0) {
      const descending = String(sort).startsWith('-');
      const column = String(sort).replace(/^-/, '') === 'created_date' ? 'created_at' : String(sort).replace(/^-/, '');
      const { data, error } = await supabase.from(table).select('*').order(column || 'created_at', { ascending: !descending }).range(offset, offset + limit - 1);
      if (error) throw error;
      return data ?? [];
    },
    async filter(filters = {}) {
      let query = supabase.from(table).select('*');
      Object.entries(filters).forEach(([key, value]) => { query = query.eq(key, value); });
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw error;
      return data;
    },
    async bulkCreate(values) {
      const { data, error } = await supabase.from(table).insert(values).select();
      if (error) throw error;
      return data ?? [];
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(values).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async bulkUpdate(values) {
      const results = await Promise.all(values.map(({ id, ...fields }) => supabase.from(table).update(fields).eq('id', id).select().single()));
      const failure = results.find(({ error }) => error);
      if (failure?.error) throw failure.error;
      return results.map(({ data }) => data);
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
  };
}

async function uploadFile({ file }) {
  const extension = file.name?.split('.').pop() || 'bin';
  const path = `${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(path);
  return { file_url: data.publicUrl };
}

export const base44 = {
  entities: { Product: entityApi('Product'), Customer: entityApi('Customer') },
  auth: {
    async me() {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) throw error || new Error('Not authenticated');
      const { data: profile, error: profileError } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profileError) throw profileError;
      return { ...user, ...profile };
    },
    async logout() { await supabase.auth.signOut(); },
    redirectToLogin() { window.location.assign('/'); },
  },
  integrations: { Core: { UploadFile: uploadFile } },
  functions: {
    async invoke(name, body = {}) {
      const { data, error } = await supabase.functions.invoke('app-api', { body: { action: name, payload: body } });
      if (error) throw error;
      return { data };
    },
  },
};
