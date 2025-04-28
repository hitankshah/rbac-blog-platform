const supabase = require('../db/supabase');

const User = {
  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows returned" error
    return data;
  },

  async find() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, created_at');
    
    if (error) throw error;
    return data;
  },

  async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        name: userData.name,
        email: userData.email,
        password: userData.password, // Should be hashed before storing
        role: userData.role || 'user'
      }])
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async update(id, updates) {
    updates.updated_at = new Date();
    
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  },

  async remove(id) {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

module.exports = User;
