create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'user');
create type public.product_category as enum ('running', 'basketball', 'training', 'lifestyle', 'kids', 'accessories', 'apparel');
create type public.product_gender as enum ('mens', 'womans');
create type public.product_status as enum ('active', 'draft', 'archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  description text,
  category public.product_category,
  gender public.product_gender,
  price numeric(12,2),
  images text[] not null default '{}',
  colors text[] not null default '{}',
  sizes text[] not null default '{}',
  stock jsonb not null default '{}'::jsonb,
  total_stock numeric not null default 0,
  featured boolean not null default false,
  status public.product_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  contact text,
  customer_code text not null unique,
  discount numeric(5,2) not null default 0 check (discount between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products(category);
create index products_status_idx on public.products(status);
create index customers_contact_idx on public.customers(lower(contact));

create schema if not exists private;
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function private.set_updated_at() from public, anon, authenticated;

create trigger profiles_updated_at before update on public.profiles for each row execute function private.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function private.set_updated_at();
create trigger customers_updated_at before update on public.customers for each row execute function private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;

create policy "profile owner can read" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "authenticated users read products" on public.products for select to authenticated using (true);
create policy "admins insert products" on public.products for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins update products" on public.products for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins delete products" on public.products for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins read customers" on public.customers for select to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins insert customers" on public.customers for insert to authenticated
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins update customers" on public.customers for update to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins delete customers" on public.customers for delete to authenticated
using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.products to authenticated;
grant insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.customers to authenticated;

insert into storage.buckets (id, name, public) values ('uploads', 'uploads', true)
on conflict (id) do update set public = excluded.public;
create policy "authenticated upload files" on storage.objects for insert to authenticated with check (bucket_id = 'uploads');
create policy "public read uploads" on storage.objects for select to public using (bucket_id = 'uploads');
create policy "admins update uploads" on storage.objects for update to authenticated
using (bucket_id = 'uploads' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
with check (bucket_id = 'uploads' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins delete uploads" on storage.objects for delete to authenticated
using (bucket_id = 'uploads' and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- After creating your first user in Authentication > Users, promote it with:
-- update public.profiles set role = 'admin' where email = 'you@example.com';
