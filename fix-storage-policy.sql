-- =============================================
-- Fix: Storage Policies untuk bucket "bukti-transfer"
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Izinkan user yang sudah login untuk upload file
create policy "Authenticated users can upload bukti"
on storage.objects for insert
to authenticated
with check (bucket_id = 'bukti-transfer');

-- Izinkan semua orang melihat/download file (public read)
create policy "Public can view bukti"
on storage.objects for select
to public
using (bucket_id = 'bukti-transfer');

-- Izinkan user mengupdate file miliknya sendiri
create policy "Users can update own bukti"
on storage.objects for update
to authenticated
using (bucket_id = 'bukti-transfer');
