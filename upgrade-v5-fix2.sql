-- =============================================
-- Fix: Notify admins when new custom request is submitted
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Function: Notify admins on new custom request
create or replace function public.notify_admins_new_request()
returns trigger as $$
declare
  admin_record record;
  client_name text;
begin
  -- Get client name
  select full_name into client_name from public.profiles where id = NEW.client_id;

  -- Notify all admins
  for admin_record in select id from public.profiles where role = 'admin'
  loop
    insert into public.notifications (user_id, type, title, body, data)
    values (
      admin_record.id,
      'custom_request',
      '📩 Request Custom Baru!',
      coalesce(client_name, 'Client') || ' mengajukan request: "' || coalesce(NEW.judul, 'Custom Request') || '"',
      jsonb_build_object('request_id', NEW.id, 'client_name', client_name, 'judul', NEW.judul)
    );
  end loop;

  return NEW;
end;
$$ language plpgsql security definer;

-- Trigger: New custom request → notify admins
drop trigger if exists trigger_notify_admins_new_request on public.custom_requests;
create trigger trigger_notify_admins_new_request
  after insert on public.custom_requests
  for each row
  execute function public.notify_admins_new_request();
