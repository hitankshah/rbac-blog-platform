    -- This will only update the role, not the password (since password auth is handled by Supabase)
    UPDATE public.users
    SET role = 'admin'
    WHERE email = 'hitankjain@gmail.com';

    -- Verify the update
    SELECT id, email, name, role FROM public.users WHERE email = 'hitankjain@gmail.com';
