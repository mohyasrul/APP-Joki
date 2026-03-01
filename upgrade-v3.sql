-- =============================================
-- JokiHub - Upgrade V3: Hasil Multi-file, Kategori Dinamis, Avatar
-- Jalankan di Supabase SQL Editor
-- =============================================

-- 1. Tabel Kategori (admin bisa CRUD)
create table if not exists public.kategori (
  id uuid default gen_random_uuid() primary key,
  nama text unique not null,
  urutan integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default kategori
insert into public.kategori (nama, urutan) values
  ('Makalah', 1), ('PPT', 2), ('Coding', 3), ('Skripsi', 4),
  ('Laporan', 5), ('Desain', 6), ('Lainnya', 99)
on conflict (nama) do nothing;

-- RLS Kategori
alter table public.kategori enable row level security;
create policy "Everyone can read kategori" on public.kategori for select using (true);
create policy "Admin can insert kategori" on public.kategori for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can update kategori" on public.kategori for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can delete kategori" on public.kategori for delete using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- 2. Kolom baru di orders untuk multi-file hasil + catatan
alter table public.orders add column if not exists hasil_files jsonb default '[]'::jsonb;
alter table public.orders add column if not exists catatan_hasil text;

-- 3. Kolom avatar di profiles
alter table public.profiles add column if not exists avatar_url text;
