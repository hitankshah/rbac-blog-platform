const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { db } = require('../config/db');

const authService = {
  async register(userData) {
    const { name, email, password } = userData;
    
    // Check if user exists
    const existingUser = await db.from('users').select('*').eq('email', email).single();
    if (existingUser.data) {
      throw new Error('User already exists');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user with default role 'user'
    const { data, error } = await db.from('users').insert({
      name,
      email,
      password: hashedPassword,
      role: 'user',
      verified: false
    }).select().single();
    
    if (error) throw error;
    
    // Generate verification token
    const verificationToken = jwt.sign(
      { userId: data.id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    return { user: data, verificationToken };
  },
  
  async login(email, password) {
    // Find user
    const { data: user, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !user) throw new Error('User not found');
    if (!user.verified) throw new Error('Please verify your email first');
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) throw new Error('Invalid password');
    
    // Generate token
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    return { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
  },
  
  async verifyEmail(token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Update user verification status
      const { error } = await db
        .from('users')
        .update({ verified: true })
        .eq('id', decoded.userId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
};

module.exports = authService;
