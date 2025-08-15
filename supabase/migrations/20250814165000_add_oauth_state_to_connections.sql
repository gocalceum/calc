-- Add oauth_state column to hmrc_connections for idempotency
ALTER TABLE public.hmrc_connections 
ADD COLUMN IF NOT EXISTS oauth_state TEXT UNIQUE;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hmrc_connections_oauth_state 
ON public.hmrc_connections(oauth_state);

-- Add comment
COMMENT ON COLUMN public.hmrc_connections.oauth_state IS 'OAuth state parameter used for idempotency - ensures callback is only processed once';