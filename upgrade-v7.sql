-- =============================================
-- upgrade-v7.sql — P2 Promo Enhancement
-- #14: Add expired_at column to promos
-- #15: Add max_potongan column to promos
-- + Update claim_promo() to check both
-- =============================================

-- #14: Promo expiry date
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS expired_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- #15: Max discount cap for percentage promos
ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS max_potongan INTEGER DEFAULT NULL;

-- Update claim_promo to enforce expiry + max cap
DROP FUNCTION IF EXISTS claim_promo(TEXT);
CREATE OR REPLACE FUNCTION claim_promo(p_kode TEXT)
RETURNS TABLE(
  out_id UUID,
  out_kode TEXT,
  out_tipe TEXT,
  out_nilai NUMERIC,
  out_kuota INT,
  out_terpakai INT,
  out_aktif BOOLEAN,
  out_max_potongan INT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  promo_row promos%ROWTYPE;
BEGIN
  -- Lock the row to prevent concurrent claims
  SELECT * INTO promo_row
  FROM promos p
  WHERE p.kode = p_kode AND p.aktif = true
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kode promo tidak valid atau sudah tidak aktif';
  END IF;

  -- #14: Check expiry
  IF promo_row.expired_at IS NOT NULL AND promo_row.expired_at < NOW() THEN
    RAISE EXCEPTION 'Promo sudah expired';
  END IF;

  IF promo_row.kuota IS NOT NULL AND promo_row.terpakai >= promo_row.kuota THEN
    RAISE EXCEPTION 'Kuota promo sudah habis';
  END IF;

  -- Increment usage atomically
  UPDATE promos SET terpakai = promos.terpakai + 1 WHERE promos.id = promo_row.id;

  out_id := promo_row.id;
  out_kode := promo_row.kode;
  out_tipe := promo_row.tipe;
  out_nilai := promo_row.nilai;
  out_kuota := promo_row.kuota;
  out_terpakai := promo_row.terpakai + 1;
  out_aktif := promo_row.aktif;
  out_max_potongan := promo_row.max_potongan;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION claim_promo(TEXT) TO authenticated;
