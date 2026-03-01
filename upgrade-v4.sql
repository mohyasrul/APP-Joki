-- =============================================
-- JokiHub - Upgrade V4: Custom Joki Requests
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Tabel Custom Requests
create table if not exists public.custom_requests (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles(id) not null,
  judul text not null,
  deskripsi text,
  deadline date,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  harga_final integer,
  catatan_admin text,
  order_id uuid references public.orders(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.custom_requests enable row level security;

create policy "Client can read own requests" on public.custom_requests
  for select using (client_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "Client can insert requests" on public.custom_requests
  for insert with check (client_id = auth.uid());

create policy "Admin can update requests" on public.custom_requests
  for update using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));
-- Fix: Allow admin to also insert orders (for custom requests)
create policy "Admin can insert orders" on public.orders for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
