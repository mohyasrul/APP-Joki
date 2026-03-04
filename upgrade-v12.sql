-- upgrade-v12.sql
-- Chat notification trigger: notify recipient when a new message is sent

-- Function: triggered AFTER INSERT on order_messages
CREATE OR REPLACE FUNCTION public.notify_on_chat_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_client_id uuid;
    v_sender_role text;
    v_judul text;
BEGIN
    -- Get order's client + layanan title
    SELECT o.client_id, COALESCE(l.judul_tugas, 'Pesanan')
    INTO v_client_id, v_judul
    FROM public.orders o
    LEFT JOIN public.layanan l ON l.id = o.layanan_id
    WHERE o.id = NEW.order_id;

    -- Get sender role
    SELECT role INTO v_sender_role
    FROM public.profiles WHERE id = NEW.sender_id;

    IF v_sender_role = 'client' THEN
        -- Notify all admins
        INSERT INTO public.notifications (user_id, type, title, body, data)
        SELECT p.id,
               'chat_message',
               'Pesan baru dari klien',
               LEFT(NEW.content, 80),
               jsonb_build_object('order_id', NEW.order_id)
        FROM public.profiles p
        WHERE p.role = 'admin';
    ELSE
        -- Notify the client (only if sender is NOT the client themselves)
        IF v_client_id IS NOT NULL AND v_client_id <> NEW.sender_id THEN
            INSERT INTO public.notifications (user_id, type, title, body, data)
            VALUES (
                v_client_id,
                'chat_message',
                'Admin membalas pesananmu',
                LEFT(NEW.content, 80),
                jsonb_build_object('order_id', NEW.order_id)
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach trigger to order_messages
DROP TRIGGER IF EXISTS on_chat_message_insert ON public.order_messages;
CREATE TRIGGER on_chat_message_insert
    AFTER INSERT ON public.order_messages
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_chat_message();
