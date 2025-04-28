-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist to ensure clean setup
DROP TABLE IF EXISTS blog_images;
DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS blog_posts;
DROP TABLE IF EXISTS users;

-- Create users table - Modified to support Supabase Auth
CREATE TABLE public.users (
  id UUID PRIMARY KEY, -- Will use the Supabase Auth user ID
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255), -- Nullable for Supabase Auth
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'user', 'admin'
  verified BOOLEAN DEFAULT false,
  verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create blog_images table for storing post images
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
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

-- Create admin stats function with image counts
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON AS $$
DECLARE
  total_users INT;
  total_posts INT;
  total_images INT;
  new_users_this_week INT;
  new_posts_this_week INT;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM public.users;
  
  -- Count total posts
  SELECT COUNT(*) INTO total_posts FROM public.blog_posts;
  
  -- Count total images
  SELECT COUNT(*) INTO total_images FROM public.blog_images;
  
  -- Count new users in the last 7 days
  SELECT COUNT(*) INTO new_users_this_week 
  FROM public.users 
  WHERE created_at >= NOW() - INTERVAL '7 days';
  
  -- Count new posts in the last 7 days
  SELECT COUNT(*) INTO new_posts_this_week 
  FROM public.blog_posts 
  WHERE created_at >= NOW() - INTERVAL '7 days';
  
  -- Return as JSON
  RETURN json_build_object(
    'totalUsers', total_users,
    'totalPosts', total_posts,
    'totalImages', total_images,
    'newUsersThisWeek', new_users_this_week,
    'newPostsThisWeek', new_posts_this_week
  );
END;
$$ LANGUAGE plpgsql;

-- Enable RLS on blog_posts and blog_images tables
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own blog posts
CREATE POLICY "Allow insert for authenticated users on blog_posts"
  ON public.blog_posts
  FOR INSERT
  USING (
    auth.role() = 'authenticated'
    AND user_id = auth.uid()
  );

-- Allow authenticated users to insert images
CREATE POLICY "Allow insert for authenticated users on blog_images"
  ON public.blog_images
  FOR INSERT
  USING (
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to select their own blog posts
CREATE POLICY "Allow select for authenticated users on blog_posts"
  ON public.blog_posts
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Allow authenticated users to select images
CREATE POLICY "Allow select for authenticated users on blog_images"
  ON public.blog_images
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

-- Supabase Storage: Allow authenticated users to upload images
-- (Run this in the Supabase SQL editor if using storage)
CREATE POLICY "Allow upload for authenticated"
  ON storage.objects
  FOR INSERT
  USING (
    auth.role() = 'authenticated'
  );

-- Insert an admin user (you should change the ID to match your Supabase Auth user)
-- Uncomment and modify this after creating your first user
/*
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
*/
