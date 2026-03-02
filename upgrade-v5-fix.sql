-- =============================================
-- Fix: Enable full replica identity for realtime old data comparison
-- Jalankan di Supabase SQL Editor
-- =============================================

-- Agar payload.old di realtime berisi semua kolom (bukan hanya PK)
alter table public.orders replica identity full;
alter table public.custom_requests replica identity full;
