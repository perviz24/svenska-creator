-- Create AI response cache table
CREATE TABLE public.ai_response_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key text NOT NULL UNIQUE,
  function_name text NOT NULL,
  request_hash text NOT NULL,
  response jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  hit_count integer NOT NULL DEFAULT 0
);

-- Create index for fast lookups
CREATE INDEX idx_ai_cache_key ON public.ai_response_cache (cache_key);
CREATE INDEX idx_ai_cache_expires ON public.ai_response_cache (expires_at);

-- Enable RLS but allow edge functions to access via service role
ALTER TABLE public.ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Policy for service role access (edge functions use service role)
CREATE POLICY "Service role can manage cache"
ON public.ai_response_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION public.clean_expired_ai_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.ai_response_cache WHERE expires_at < now();
END;
$$;