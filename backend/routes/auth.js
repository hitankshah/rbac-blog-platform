const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Login user
router.post('/login', async function(req, res) {
  console.log('Login request received:');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body));

  try {
    let email, password;

    if (req.body.email && typeof req.body.email === 'object') {
      email = req.body.email.email;
      password = req.body.email.password;
      console.log('Detected nested email object structure');
    } else {
      email = req.body.email;
      password = req.body.password;
    }

    console.log(`Extracted email: ${email}`);
    console.log(`Password provided: ${password ? 'YES' : 'NO'}`);

    if (!email) {
      return res.status(400).json({ message: 'Email is required', field: 'email' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required', field: 'password' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error from Supabase:', error);
      if (error.message.includes('Invalid login credentials')) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
      throw error;
    }

    console.log('Supabase login successful for:', data.user.id);

    // Fetch user from 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (userError && userError.code === 'PGRST116') {
      console.log('User not found in database, creating user record');

      const { data: newUserData, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || 'User',
            role: 'user',
            verified: data.user.email_confirmed_at ? true : false
          }
        ])
        .select()
        .single();

      if (insertError) {
        console.error('User creation error:', insertError);
        throw { status: 500, message: 'Error creating user profile' };
      }

      console.log('New user record created successfully');
      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          name: newUserData.name,
          role: newUserData.role,
          verified: newUserData.verified
        },
        token: data.session.access_token
      });
    } else if (userError) {
      throw userError;
    }

    // Update verified status if email is confirmed
    if (data.user.email_confirmed_at && !userData.verified) {
      await supabase
        .from('users')
        .update({ verified: true })
        .eq('id', data.user.id);

      userData.verified = true;
    }

    console.log('User data retrieved successfully');
    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        name: userData.name,
        role: userData.role,
        verified: userData.verified
      },
      token: data.session.access_token
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(error.status || 500).json({
      message: error.message || 'Login failed',
      code: error.code
    });
  }
});

// Register user
router.post('/register', async function(req, res) {
  // Log request for debugging
  console.log('Register request received:');
  console.log('Headers:', JSON.stringify(req.headers));
  console.log('Body:', JSON.stringify(req.body));
  
  try {
    // Destructure with fallback values to prevent errors
    const { name = '', email = '', password = '' } = req.body || {};
    
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }
    
    console.log(`Attempting to register user: ${email} with name: ${name}`);

    // Sign up user with Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        },
        emailRedirectTo: process.env.REDIRECT_URL
      }
    });

    if (error) {
      console.error('Supabase registration error:', error);
      throw error;
    }

    console.log('Supabase auth user created:', data.user.id);

    // Create user in our users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: data.user.id,
          email: data.user.email,
          name,
          role: 'user', // Default role
          verified: false
        }
      ])
      .select()
      .single();

    if (userError) {
      console.error('Error creating user in database:', userError);
      // Continue even if there's an error - the user was created in auth
    }

    res.status(201).json({ 
      message: 'Registration successful! Please check your email to verify your account.',
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(error.status || 500).json({ 
      message: error.message || 'Registration failed',
      code: error.code
    });
  }
});

// Get current user
router.get('/me', async function(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Error getting user from token:', error);
      throw { status: 401, message: 'Invalid or expired token' };
    }

    // Fetch user from 'users' table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError);
      
      // If user exists in auth but not in our table, create the record
      if (userError.code === 'PGRST116') {
        const { data: newUserData, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || 'User',
              role: 'user',
              verified: user.email_confirmed_at ? true : false
            }
          ])
          .select()
          .single();
          
        if (insertError) {
          console.error("User creation error:", insertError);
          return res.status(500).json({ message: 'Error creating user profile' });
        }
        
        return res.status(200).json({
          id: user.id,
          email: user.email,
          name: newUserData.name,
          role: newUserData.role,
          verified: newUserData.verified
        });
      }
      
      throw userError;
    }

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: userData.name,
      role: userData.role,
      verified: userData.verified
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(error.status || 500).json({
      message: error.message || 'Failed to retrieve user information',
      code: error.code
    });
  }
});

// Logout route
router.post('/logout', async function(req, res) {
  console.log('Logout request received');
  
  try {
    // Get token from header if available
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (token) {
      // Try to sign out using the token
      const { error } = await supabase.auth.signOut({
        scope: 'global' // Sign out from all devices
      });
      
      if (error) {
        console.error('Error during Supabase signout:', error);
        // Continue regardless of error to ensure client-side logout works
      } else {
        console.log('Supabase signout successful');
      }
    }
    
    // Always return success to client to ensure they can logout
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    // Even on server error, tell client logout was successful
    // This ensures the client can clear their local state
    res.status(200).json({ message: 'Logout processed' });
  }
});

module.exports = router;
