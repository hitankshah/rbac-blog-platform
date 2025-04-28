-- Direct SQL functions to execute in the Supabase SQL Editor to help bypass RLS

-- Enable direct access to blog_posts for authenticated users
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_images DISABLE ROW LEVEL SECURITY;

-- Make service role bypass RLS to have absolute control
ALTER ROLE service_role BYPASSRLS;

-- Re-enable RLS after making service role a bypasser
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;

-- Add special policy for RPC functions
CREATE POLICY "allow_rpc_functions_on_blog_posts"
  ON public.blog_posts
  USING (true)
  WITH CHECK (true);
  
CREATE POLICY "allow_rpc_functions_on_blog_images"
  ON public.blog_images
  USING (true)
  WITH CHECK (true);

-- Create a direct insert function for blog posts
CREATE OR REPLACE FUNCTION public.direct_insert_blog_post(
  p_title TEXT,
  p_content TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_post_id UUID;
BEGIN
  INSERT INTO public.blog_posts (title, content, user_id)
  VALUES (p_title, p_content, p_user_id)
  RETURNING id INTO new_post_id;
  
  RETURN new_post_id;
END;
$$;

-- Allow anyone to execute this function
GRANT EXECUTE ON FUNCTION public.direct_insert_blog_post TO PUBLIC;
