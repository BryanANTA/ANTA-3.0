# ANTA Pulse Pro — Supabase edition

This is the migrated version of the original Base44 React/Vite app. Supabase now provides the database, authentication, file storage and backend API. Vercel can host the frontend on its free tier.

## 1. Create and configure Supabase

1. Create a free project at https://database.new.
2. In the Supabase dashboard open **SQL Editor**.
3. Open `supabase/migrations/202608170001_initial_schema.sql`, paste its contents into the editor, and click **Run** once.
4. Open **Authentication → Users → Add user** and create your login.
5. Return to **SQL Editor** and promote that account:

```sql
update public.profiles set role = 'admin' where email = 'YOUR_EMAIL';
```

6. Open **Project Settings → API** and copy the Project URL and publishable key. Never use the secret/service-role key in the frontend.

## 2. Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` with:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

## 3. Deploy the backend function

Install the Supabase CLI, sign in, and link the project. Use `supabase --help` if your installed CLI syntax differs.

```bash
npx supabase init
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy app-api
```

Optional web-based product enrichment uses Gemini. The catalogue, uploads, imports and ordering work without it. To enable it:

```bash
npx supabase secrets set GEMINI_API_KEY=YOUR_KEY
```

## 4. Deploy the website free on Vercel

1. Upload this project to a GitHub repository.
2. In Vercel choose **Add New → Project** and import the repository.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` under **Environment Variables**.
4. Deploy. Vercel detects Vite automatically.

## 5. Import Base44 data

Export Products and Customers from Base44 as CSV. In Supabase open **Table Editor**, choose the matching table, then **Insert → Import data from CSV**. Map `created_date` to `created_at` if it exists. Do not import Base44 passwords; create users through Supabase Authentication.

## Security

Row Level Security is enabled. Signed-in users can read products. Only users whose `profiles.role` is `admin` can change products or access customers. Uploaded files are public so catalogue images and spreadsheet imports can be processed. The publishable key is safe in the browser with these policies; the secret/service-role key must remain server-side.
