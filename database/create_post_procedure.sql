-- Function to create a post bypassing RLS
CREATE OR REPLACE FUNCTION public.create_post_for_user(
  p_title TEXT,
  p_content TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the user who created the function
AS $$
DECLARE
  new_post_id UUID;
  new_post JSONB;
BEGIN
  -- Insert the post
  INSERT INTO public.blog_posts (title, content, user_id, created_at, updated_at)
  VALUES (p_title, p_content, p_user_id, NOW(), NOW())
  RETURNING id INTO new_post_id;
  
  -- Get the complete post data
  SELECT jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'content', p.content,
    'user_id', p.user_id,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) INTO new_post
  FROM public.blog_posts p
  WHERE p.id = new_post_id;
  
  RETURN new_post;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_post_for_user TO authenticated;

-- Add a comment explaining what this function does
COMMENT ON FUNCTION public.create_post_for_user IS 'Creates a blog post for a user, bypassing RLS policies';
