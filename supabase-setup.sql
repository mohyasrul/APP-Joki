-- =============================================
-- JokiHub - Supabase Database Setup
-- Jalankan script ini di Supabase SQL Editor
-- =============================================

-- 1. Tabel Profiles (terhubung dengan Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  phone text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabel Layanan (Katalog Joki Mingguan)
create table public.layanan (
  id uuid default gen_random_uuid() primary key,
  judul_tugas text not null,
  deskripsi text,
  harga_estimasi integer not null default 0,
  tersedia boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabel Orders (Pesanan Joki)
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  layanan_id uuid references public.layanan(id),
  client_id uuid references public.profiles(id),
  detail_tambahan text,
  harga_final integer not null default 0,
  status_pembayaran text not null default 'Belum Bayar' check (status_pembayaran in ('Belum Bayar', 'Menunggu Verifikasi', 'Lunas')),
  bukti_transfer_url text,
  status_pekerjaan text not null default 'Menunggu Diproses' check (status_pekerjaan in ('Menunggu Diproses', 'Sedang Dikerjakan', 'Selesai', 'Batal')),
  tenggat_waktu date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on public.profiles for insert with check (auth.uid() = id);

-- Layanan
alter table public.layanan enable row level security;
create policy "Layanan viewable by everyone" on public.layanan for select using (true);
create policy "Admin can insert layanan" on public.layanan for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admin can update layanan" on public.layanan for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Orders
alter table public.orders enable row level security;
create policy "Clients can view own orders" on public.orders for select using (
  auth.uid() = client_id or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Clients can insert orders" on public.orders for insert with check (auth.uid() = client_id);
create policy "Orders can be updated by owner or admin" on public.orders for update using (
  auth.uid() = client_id or
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- Storage Bucket untuk Bukti Transfer
-- =============================================
-- Buat bucket "bukti-transfer" di Supabase Dashboard > Storage
-- Set policy: authenticated users can upload, public can read

-- =============================================
-- Buat Admin Pertama (Ganti email sesuai akun Anda)
-- Jalankan SETELAH register akun admin lewat web
-- =============================================
-- UPDATE public.profiles SET role = 'admin' WHERE id = 'UUID_ADMIN_ANDA';
