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

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;

-- Clean up any previous policies to avoid conflicts
DROP POLICY IF EXISTS "Allow insert for users and admin on blog-posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow select for users and admin on blog-posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow insert for users and admin on blog-images" ON public.blog_images;
DROP POLICY IF EXISTS "Allow select for users and admin on blog-images" ON public.blog_images;
DROP POLICY IF EXISTS "Allow blog post inserts" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow blog post reads" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow blog post updates" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow blog post deletes" ON public.blog_posts;
DROP POLICY IF EXISTS "Allow image inserts" ON public.blog_images;
DROP POLICY IF EXISTS "Allow image reads" ON public.blog_images;

-- Create fresh policies with consistent naming
-- Policy for blog_posts: insert 
CREATE POLICY "blog_posts_insert_policy"
  ON public.blog_posts
  FOR INSERT
  WITH CHECK (
    -- Allow service role to bypass all checks
    auth.role() = 'service_role' 
    OR 
    -- Allow admins to insert any post
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ))
    OR 
    -- Normal user can only post as themselves
    (auth.role() = 'authenticated' AND user_id = auth.uid())
  );

-- Policy for blog_posts: select - anyone can read
CREATE POLICY "blog_posts_select_policy"
  ON public.blog_posts
  FOR SELECT
  USING (true);

-- Policy for blog_posts: update
CREATE POLICY "blog_posts_update_policy"
  ON public.blog_posts
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ))
    OR
    (auth.role() = 'authenticated' AND user_id = auth.uid())
  );

-- Policy for blog_posts: delete
CREATE POLICY "blog_posts_delete_policy"
  ON public.blog_posts
  FOR DELETE
  USING (
    auth.role() = 'service_role'
    OR
    (auth.role() = 'authenticated' AND EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ))
    OR
    (auth.role() = 'authenticated' AND user_id = auth.uid())
  );

-- Policy for blog_images: insert
CREATE POLICY "blog_images_insert_policy"
  ON public.blog_images
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' 
    OR 
    auth.role() = 'authenticated'
  );

-- Policy for blog_images: select - anyone can view
CREATE POLICY "blog_images_select_policy"
  ON public.blog_images
  FOR SELECT
  USING (true);

-- Storage policy - allow uploads for authenticated users
CREATE POLICY "storage_insert_policy"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role' 
    OR 
    auth.role() = 'authenticated'
  );
