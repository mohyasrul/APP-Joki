-- =============================================
-- upgrade-v10.sql — P4 Features: Chat, Timeline, Attachments
-- #33: order_messages table (chat per order)
-- #34: order_activities table + status change trigger
-- #35: order_files column on orders
-- =============================================

-- -------------------------------------------------------
-- #35 — File attachments at order creation
-- -------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_files jsonb DEFAULT '[]';


-- -------------------------------------------------------
-- #33 — Chat messages per order
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_messages (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    sender_id   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_messages_order_id ON public.order_messages (order_id, created_at);

-- RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Admin: full access
CREATE POLICY "Admin full access on order_messages"
  ON public.order_messages
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Client: read/insert only on their own orders
CREATE POLICY "Client read own order messages"
  ON public.order_messages
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_messages.order_id AND client_id = auth.uid())
  );

CREATE POLICY "Client insert own order messages"
  ON public.order_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders WHERE id = order_messages.order_id AND client_id = auth.uid())
  );

-- Enable Realtime for order_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;


-- -------------------------------------------------------
-- #34 — Order activity timeline
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_activities (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    action      text NOT NULL,  -- e.g. 'status_change', 'payment_update', 'order_created'
    old_value   text,
    new_value   text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_activities_order_id ON public.order_activities (order_id, created_at);

-- RLS
ALTER TABLE public.order_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on order_activities"
  ON public.order_activities
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Client read own order activities"
  ON public.order_activities
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_activities.order_id AND client_id = auth.uid())
  );


-- Trigger: log status changes automatically
CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Log status_pekerjaan change
    IF OLD.status_pekerjaan IS DISTINCT FROM NEW.status_pekerjaan THEN
        INSERT INTO public.order_activities (order_id, actor_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'status_pekerjaan', OLD.status_pekerjaan, NEW.status_pekerjaan);
    END IF;

    -- Log status_pembayaran change
    IF OLD.status_pembayaran IS DISTINCT FROM NEW.status_pembayaran THEN
        INSERT INTO public.order_activities (order_id, actor_id, action, old_value, new_value)
        VALUES (NEW.id, auth.uid(), 'status_pembayaran', OLD.status_pembayaran, NEW.status_pembayaran);
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_status_change ON public.orders;
CREATE TRIGGER on_order_status_change
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.log_order_status_change();

-- Seed initial "order created" activity for existing orders (no actor)
INSERT INTO public.order_activities (order_id, actor_id, action, old_value, new_value, created_at)
SELECT id, client_id, 'order_created', NULL, status_pekerjaan, created_at
FROM public.orders
WHERE NOT EXISTS (
    SELECT 1 FROM public.order_activities a WHERE a.order_id = orders.id AND a.action = 'order_created'
);
