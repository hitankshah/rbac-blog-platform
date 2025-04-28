const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with anon key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Initialize admin client with service role key to bypass RLS
const adminSupabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
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
    
    // For debugging
    console.log('Verifying token for request:', req.method, req.originalUrl);
    
    try {
      // Use the adminSupabase client to verify the token
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({
          message: 'Invalid or expired token',
          error: error.message
        });
      }
      
      if (!data || !data.user) {
        return res.status(401).json({ message: 'User not found for token' });
      }
      
      const user = data.user;
      
      // For debugging
      console.log('User found for token:', user.id);
      
      // Get user details from the database
      const { data: userData, error: userError } = await adminSupabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
        
        // If user doesn't exist in our database, create one
        if (userError.code === 'PGRST116') {
          const { data: newUser, error: createError } = await adminSupabase
            .from('users')
            .insert([{
              id: user.id,
              name: user.user_metadata?.name || 'User',
              email: user.email,
              role: 'user',
              verified: user.email_confirmed_at ? true : false
            }])
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating user:', createError);
            return res.status(500).json({ message: 'Error setting up user profile' });
          }
          
          req.user = newUser;
        } else {
          return res.status(500).json({ message: 'Error fetching user profile' });
        }
      } else {
        req.user = userData;
      }
      
      // For debugging
      console.log('User role:', req.user.role);
      
      next();
    } catch (supabaseError) {
      console.error('Error in Supabase auth:', supabaseError);
      return res.status(500).json({
        message: 'Authentication service error',
        error: supabaseError.message
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      message: 'Authentication error',
      error: error.message || String(error)
    });
  }
};
