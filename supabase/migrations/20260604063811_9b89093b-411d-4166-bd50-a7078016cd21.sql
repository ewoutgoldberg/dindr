
-- Extensions for scheduled sync
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1) creator_social_connections (tokens are server-only)
CREATE TABLE public.creator_social_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.food_creators(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram','tiktok')),
  platform_user_id text,
  platform_username text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scope text,
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','disconnected','error')),
  last_synced_at timestamptz,
  last_error text,
  connected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, platform)
);

-- Column-level grants: never expose tokens via PostgREST
GRANT SELECT (id, creator_id, platform, platform_user_id, platform_username, status, last_synced_at, last_error, connected_at, created_at, updated_at)
  ON public.creator_social_connections TO authenticated;
GRANT ALL ON public.creator_social_connections TO service_role;

ALTER TABLE public.creator_social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators view own connections"
  ON public.creator_social_connections FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.food_creators c WHERE c.id = creator_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER trg_csc_updated BEFORE UPDATE ON public.creator_social_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) social_posts
CREATE TABLE public.social_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.food_creators(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('instagram','tiktok')),
  external_id text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image','video','carousel')),
  media_url text,
  thumbnail_url text,
  caption text,
  post_url text,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (platform, external_id)
);

CREATE INDEX idx_social_posts_creator_posted ON public.social_posts (creator_id, posted_at DESC);

GRANT SELECT ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Social posts viewable by authenticated"
  ON public.social_posts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage social posts"
  ON public.social_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 3) social_sync_logs
CREATE TABLE public.social_sync_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id uuid REFERENCES public.creator_social_connections(id) ON DELETE SET NULL,
  creator_id uuid REFERENCES public.food_creators(id) ON DELETE CASCADE,
  platform text,
  status text NOT NULL CHECK (status IN ('success','error')),
  posts_added integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sync_logs_creator ON public.social_sync_logs (creator_id, created_at DESC);

GRANT SELECT ON public.social_sync_logs TO authenticated;
GRANT ALL ON public.social_sync_logs TO service_role;

ALTER TABLE public.social_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin view sync logs"
  ON public.social_sync_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.food_creators c WHERE c.id = creator_id AND c.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );
