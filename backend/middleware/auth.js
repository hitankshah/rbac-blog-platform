const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required: No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Authentication required: Invalid token format' });
    }
    
    try {
      // Use a different approach to verify the token
      // First, create a new Supabase client with the session token
      const authenticatedSupabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        }
      );
      
      // Get the current user (will fail if token is invalid)
      const { data, error } = await authenticatedSupabase.auth.getUser();
      if (error) {
        console.error("Token verification failed:", error);
        if (error.message && error.message.includes('Auth session missing')) {
          return res.status(401).json({ 
            message: 'Session expired or user logged out. Please login again.', 
            code: 'SESSION_EXPIRED'
          });
        }
        return res.status(401).json({ 
          message: 'Invalid or expired token', 
          error: error.message 
        });
      }
      
      if (!data.user) {
        return res.status(401).json({ message: 'User not found' });
      }
      
      const user = data.user;
      
      // Get additional user data from our users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, name, email, role, verified')
        .eq('id', user.id)
        .single();
        
      if (userError) {
        console.error("User data fetch error:", userError);
        
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
          
          req.user = {
            id: user.id,
            email: user.email,
            name: newUserData.name,
            role: newUserData.role,
            verified: newUserData.verified
          };
        } else {
          return res.status(404).json({ message: 'User profile not found' });
        }
      } else {
        // User exists in our table
        req.user = {
          id: user.id,
          email: user.email,
          name: userData.name,
          role: userData.role,
          verified: userData.verified
        };
      }
      
      next();
    } catch (supabaseError) {
      console.error('Supabase auth error:', supabaseError);
      return res.status(401).json({ message: 'Authentication error', error: supabaseError.message });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(error.status || 500).json({ 
      message: error.message || 'Authentication failed'
    });
  }
};
