
CREATE TABLE public.partner_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  plan_date DATE,
  message TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_partner_notifications_recipient ON public.partner_notifications(recipient_id, created_at DESC);

ALTER TABLE public.partner_notifications ENABLE ROW LEVEL SECURITY;

-- Sender or recipient can view
CREATE POLICY "Sender or recipient view"
ON public.partner_notifications FOR SELECT
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Only insert for your actual partner
CREATE POLICY "Send to partner only"
ON public.partner_notifications FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND recipient_id = public.get_partner(auth.uid())
);

-- Recipient can mark as read (update read_at)
CREATE POLICY "Recipient marks read"
ON public.partner_notifications FOR UPDATE
TO authenticated
USING (auth.uid() = recipient_id);

-- Either party can delete
CREATE POLICY "Sender or recipient delete"
ON public.partner_notifications FOR DELETE
TO authenticated
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.partner_notifications;
