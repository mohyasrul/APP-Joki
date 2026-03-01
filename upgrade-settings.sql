-- =============================================
-- JokiHub - Settings Table + Realtime
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Tabel Settings (untuk info pembayaran dinamis)
create table if not exists public.settings (
  id text primary key default 'payment_info',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default payment info
insert into public.settings (id, data) values ('payment_info', '{
  "bank_name": "BCA",
  "bank_account": "1234567890",
  "bank_holder": "Nama Anda",
  "ewallet_name": "DANA / OVO",
  "ewallet_number": "081234567890",
  "notes": "Atau scan QRIS yang tersedia"
}'::jsonb)
on conflict (id) do nothing;

-- RLS untuk Settings
alter table public.settings enable row level security;
create policy "Everyone can read settings" on public.settings for select using (true);
create policy "Admin can update settings" on public.settings for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Enable Realtime pada tabel orders (untuk notifikasi)
alter publication supabase_realtime add table orders;
