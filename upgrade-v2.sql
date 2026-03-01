-- =============================================
-- JokiHub - Upgrade: Fitur Prioritas Sedang
-- Jalankan di Supabase SQL Editor
-- =============================================

-- 1. Tambah kolom kategori di tabel layanan
alter table public.layanan add column if not exists kategori text default 'Lainnya';

-- 2. Tambah kolom untuk upload hasil joki dan revisi di tabel orders
alter table public.orders add column if not exists hasil_url text;
alter table public.orders add column if not exists rating integer;
alter table public.orders add column if not exists review text;
alter table public.orders add column if not exists jumlah_revisi integer default 0;
alter table public.orders add column if not exists max_revisi integer default 2;
alter table public.orders add column if not exists kode_promo text;
alter table public.orders add column if not exists diskon integer default 0;

-- 3. Tabel Promo
create table if not exists public.promos (
  id uuid default gen_random_uuid() primary key,
  kode text unique not null,
  deskripsi text,
  tipe text not null default 'persen' check (tipe in ('persen', 'nominal')),
  nilai integer not null default 0,
  aktif boolean default true,
  kuota integer default null,
  terpakai integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Promos
alter table public.promos enable row level security;
create policy "Everyone can read active promos" on public.promos for select using (true);
create policy "Admin can manage promos" on public.promos for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can update promos" on public.promos for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can delete promos" on public.promos for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
