-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (with CASCADE to drop dependent objects)
DROP TABLE IF EXISTS "blog-images" CASCADE;
DROP TABLE IF EXISTS "blog_images" CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS "blog-posts" CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table (supporting Supabase Auth)
CREATE TABLE public.users (
  id UUID PRIMARY KEY, -- Supabase Auth user ID
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255), -- Nullable for Supabase Auth
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_posts table (consistent naming without hyphens)
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_images table (consistent naming without hyphens)
CREATE TABLE public.blog_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  content_type VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create comments table
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ 
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
  BEFORE UPDATE ON public.comments
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Admin stats function
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  total_users INT;
  total_posts INT;
  total_images INT;
  new_users_this_week INT;
  new_posts_this_week INT;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO total_posts FROM public.blog_posts;
  SELECT COUNT(*) INTO total_images FROM public.blog_images;
  SELECT COUNT(*) INTO new_users_this_week 
  FROM public.users 
  WHERE created_at >= NOW() - INTERVAL '7 days';
  SELECT COUNT(*) INTO new_posts_this_week 
  FROM public.blog_posts 
  WHERE created_at >= NOW() - INTERVAL '7 days';
  
  RETURN json_build_object(
    'totalUsers', total_users,
    'totalPosts', total_posts,
    'totalImages', total_images,
    'newUsersThisWeek', new_users_this_week,
    'newPostsThisWeek', new_posts_this_week
  );
END;
$$ LANGUAGE plpgsql;

-- ==================== ROW LEVEL SECURITY SETUP ====================

-- Enable RLS on tables
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Ensure service_role can bypass RLS (THIS IS CRITICAL)
ALTER ROLE service_role BYPASSRLS;

-- Clean up any previous policies to avoid conflicts
DROP POLICY IF EXISTS "Allow service role full access on blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow service role full access on blog_images" ON public.blog_images;
DROP POLICY IF EXISTS "Allow service role full access on comments" ON public.comments;

DROP POLICY IF EXISTS "blog_posts_insert_policy" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_select_policy" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_update_policy" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_delete_policy" ON public.blog_posts;

DROP POLICY IF EXISTS "blog_images_insert_policy" ON public.blog_images;
DROP POLICY IF EXISTS "blog_images_select_policy" ON public.blog_images;

DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_select_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_update_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON public.comments;

-- Create explicit SERVICE ROLE policies (makes service role bypass explicit)
-- Blog posts service role policies
CREATE POLICY "Allow service role full access on blog_posts" 
  ON public.blog_posts
  FOR ALL 
  TO service_role
  USING (true) 
  WITH CHECK (true);

-- Blog images service role policies
CREATE POLICY "Allow service role full access on blog_images" 
  ON public.blog_images 
  FOR ALL 
  TO service_role
  USING (true) 
  WITH CHECK (true);

-- Comments service role policies
CREATE POLICY "Allow service role full access on comments" 
  ON public.comments 
  FOR ALL 
  TO service_role
  USING (true) 
  WITH CHECK (true);

-- Policy for blog_posts: insert 
CREATE POLICY "blog_posts_insert_policy"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    -- Allow authenticated users to insert their own posts
    auth.role() = 'authenticated' AND user_id = auth.uid()
  );

-- Policy for blog_posts: select - anyone can read
CREATE POLICY "blog_posts_select_policy"
  ON public.blog_posts
  FOR SELECT
  USING (true);

-- Policy for blog_posts: update - users can update their own posts
CREATE POLICY "blog_posts_update_policy"
  ON public.blog_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy for blog_posts: delete - users can delete their own posts
CREATE POLICY "blog_posts_delete_policy"
  ON public.blog_posts
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy for blog_images: insert - users can add images to their own posts
CREATE POLICY "blog_images_insert_policy"
  ON public.blog_images
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE id = post_id AND user_id = auth.uid()
    )
  );

-- Policy for blog_images: select - anyone can view images
CREATE POLICY "blog_images_select_policy"
  ON public.blog_images
  FOR SELECT
  USING (true);

-- Comment policies
CREATE POLICY "comments_insert_policy"
  ON public.comments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "comments_select_policy"
  ON public.comments
  FOR SELECT
  USING (true);

CREATE POLICY "comments_update_policy"
  ON public.comments
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_policy"
  ON public.comments
  FOR DELETE
  USING (auth.uid() = user_id);

-- Storage bucket policies
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
  ) THEN
    BEGIN
      -- Drop any existing policies
      DROP POLICY IF EXISTS "Allow storage access" ON storage.objects;
      
      -- Create policy for storage
      CREATE POLICY "Allow storage access"
        ON storage.objects
        FOR ALL
        TO authenticated, service_role
        USING (true)
        WITH CHECK (true);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error setting storage policies: %', SQLERRM;
    END;
  END IF;
END $$;

-- Create blog-images bucket if it doesn't exist
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'storage' 
    AND tablename = 'buckets'
  ) THEN
    BEGIN
      INSERT INTO storage.buckets (id, name) 
      VALUES ('blog-images', 'Blog Images Bucket')
      ON CONFLICT DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating storage bucket: %', SQLERRM;
    END;
  END IF;
END $$;

-- Grant necessary privileges to service_role
GRANT ALL ON public.blog_posts TO service_role;
GRANT ALL ON public.blog_images TO service_role;
GRANT ALL ON public.comments TO service_role;
