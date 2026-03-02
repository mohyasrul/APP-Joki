-- =============================================
-- JokiHub v5 - Notification System
-- Jalankan di Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. Tabel Notifications (riwayat notifikasi)
-- =============================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,           -- 'new_order', 'order_status', 'payment_update', 'custom_request'
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,  -- metadata: order_id, request_id, etc.
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
create index if not exists idx_notifications_is_read on public.notifications(user_id, is_read);

-- RLS
alter table public.notifications enable row level security;

create policy "Users can read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Service role / triggers can insert
create policy "Service can insert notifications"
  on public.notifications for insert
  with check (true);

-- =============================================
-- 2. Tabel Push Subscriptions
-- =============================================
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, endpoint)
);

create index if not exists idx_push_subs_user_id on public.push_subscriptions(user_id);

-- RLS
alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subs"
  on public.push_subscriptions for all
  using (auth.uid() = user_id);

create policy "Service can read push subs"
  on public.push_subscriptions for select
  using (true);

-- =============================================
-- 3. Function: Create notification for admins
-- =============================================
create or replace function public.notify_admins_new_order()
returns trigger as $$
declare
  admin_record record;
  client_name text;
  layanan_name text;
begin
  -- Get client name
  select full_name into client_name from public.profiles where id = NEW.client_id;
  -- Get layanan name
  if NEW.layanan_id is not null then
    select judul_tugas into layanan_name from public.layanan where id = NEW.layanan_id;
  end if;

  -- Notify all admins
  for admin_record in select id from public.profiles where role = 'admin'
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (
      admin_record.id,
      'new_order',
      '🔔 Order Baru Masuk!',
      coalesce(client_name, 'Client') || ' memesan ' || coalesce(layanan_name, 'Custom Order'),
      jsonb_build_object('order_id', NEW.id, 'client_name', client_name)
    );
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

-- =============================================
-- 4. Function: Notify client on order status change
-- =============================================
create or replace function public.notify_client_order_status()
returns trigger as $$
declare
  layanan_name text;
  notif_title text;
  notif_body text;
begin
  -- Only fire if status_pekerjaan actually changed
  if OLD.status_pekerjaan = NEW.status_pekerjaan then
    return NEW;
  end if;

  -- Get layanan name
  if NEW.layanan_id is not null then
    select judul_tugas into layanan_name from public.layanan where id = NEW.layanan_id;
  end if;

  case NEW.status_pekerjaan
    when 'Sedang Dikerjakan' then
      notif_title := '🚀 Pesanan Sedang Dikerjakan';
      notif_body := 'Pesanan "' || coalesce(layanan_name, 'Custom Order') || '" sedang dikerjakan oleh admin.';
    when 'Selesai' then
      notif_title := '✅ Pesanan Selesai!';
      notif_body := 'Pesanan "' || coalesce(layanan_name, 'Custom Order') || '" sudah selesai! Silakan cek hasilnya.';
    when 'Batal' then
      notif_title := '❌ Pesanan Dibatalkan';
      notif_body := 'Pesanan "' || coalesce(layanan_name, 'Custom Order') || '" telah dibatalkan.';
    else
      return NEW;
  end case;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    NEW.client_id,
    'order_status',
    notif_title,
    notif_body,
    jsonb_build_object('order_id', NEW.id, 'status', NEW.status_pekerjaan)
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- =============================================
-- 5. Function: Notify client on payment status change
-- =============================================
create or replace function public.notify_client_payment_status()
returns trigger as $$
declare
  layanan_name text;
  notif_title text;
  notif_body text;
begin
  -- Only fire if payment status changed
  if OLD.status_pembayaran = NEW.status_pembayaran then
    return NEW;
  end if;

  if NEW.layanan_id is not null then
    select judul_tugas into layanan_name from public.layanan where id = NEW.layanan_id;
  end if;

  case NEW.status_pembayaran
    when 'Lunas' then
      notif_title := '💰 Pembayaran Diverifikasi';
      notif_body := 'Pembayaran untuk "' || coalesce(layanan_name, 'Custom Order') || '" telah dikonfirmasi. Terima kasih!';
    when 'Belum Bayar' then
      -- This means payment was rejected (went from Menunggu Verifikasi → Belum Bayar)
      if OLD.status_pembayaran = 'Menunggu Verifikasi' then
        notif_title := '⚠️ Pembayaran Ditolak';
        notif_body := 'Bukti pembayaran untuk "' || coalesce(layanan_name, 'Custom Order') || '" ditolak. Silakan upload ulang.';
      else
        return NEW;
      end if;
    else
      return NEW;
  end case;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    NEW.client_id,
    'payment_update',
    notif_title,
    notif_body,
    jsonb_build_object('order_id', NEW.id, 'payment_status', NEW.status_pembayaran)
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- =============================================
-- 6. Function: Notify client on custom request update
-- =============================================
create or replace function public.notify_client_custom_request()
returns trigger as $$
declare
  notif_title text;
  notif_body text;
begin
  -- Only fire if status changed
  if OLD.status = NEW.status then
    return NEW;
  end if;

  case NEW.status
    when 'accepted' then
      notif_title := '🎉 Request Diterima!';
      notif_body := 'Request "' || coalesce(NEW.judul, 'Custom Request') || '" telah diterima. Silakan cek dan lakukan pembayaran.';
    when 'rejected' then
      notif_title := '😔 Request Ditolak';
      notif_body := 'Request "' || coalesce(NEW.judul, 'Custom Request') || '" sayangnya ditolak.';
    else
      return NEW;
  end case;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    NEW.client_id,
    'custom_request',
    notif_title,
    notif_body,
    jsonb_build_object('request_id', NEW.id, 'status', NEW.status, 'order_id', NEW.order_id)
  );

  return NEW;
end;
$$ language plpgsql security definer;

-- =============================================
-- 7. Triggers
-- =============================================

-- New order → notify admins
drop trigger if exists trigger_notify_admins_new_order on public.orders;
create trigger trigger_notify_admins_new_order
  after insert on public.orders
  for each row
  execute function public.notify_admins_new_order();

-- Order status change → notify client
drop trigger if exists trigger_notify_client_order_status on public.orders;
create trigger trigger_notify_client_order_status
  after update on public.orders
  for each row
  execute function public.notify_client_order_status();

-- Payment status change → notify client
drop trigger if exists trigger_notify_client_payment_status on public.orders;
create trigger trigger_notify_client_payment_status
  after update on public.orders
  for each row
  execute function public.notify_client_payment_status();

-- Custom request status change → notify client
drop trigger if exists trigger_notify_client_custom_request on public.custom_requests;
create trigger trigger_notify_client_custom_request
  after update on public.custom_requests
  for each row
  execute function public.notify_client_custom_request();

-- =============================================
-- 8. Enable Realtime on notifications table
-- =============================================
alter publication supabase_realtime add table notifications;
