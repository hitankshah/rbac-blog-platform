import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [search, setSearch] = useState('');
  const [newAdminForm, setNewAdminForm] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await axios.get(
        `${process.env.REACT_APP_API_URL || 'https://rbac-blog-platform.onrender.com'}/api/admin/users`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { page: pagination.page, limit: pagination.limit, search }
        }
      );

      setUsers(response.data.users);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, search, navigate]);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 when searching
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      
      await axios.patch(
        `${process.env.REACT_APP_API_URL || 'https://rbac-blog-platform.onrender.com'}/api/admin/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update the user in the local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      ));
      
      setFormSuccess(`User role updated to ${newRole}`);
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating role:', err);
      setError('Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete(
        `${process.env.REACT_APP_API_URL || 'https://rbac-blog-platform.onrender.com'}/api/admin/users/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Remove from local state
      setUsers(users.filter(user => user.id !== userId));
      setFormSuccess('User deleted successfully');
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    }
  };

  const handleNewAdminSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const { name, email, password } = newAdminForm;
    
    if (!name || !email || !password) {
      setFormError('All fields are required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      await axios.post(
        `${process.env.REACT_APP_API_URL || 'https://rbac-blog-platform.onrender.com'}/api/admin/create-admin`,
        newAdminForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Reset form
      setNewAdminForm({ name: '', email: '', password: '' });
      setFormSuccess('Admin created successfully');
      
      // Refresh user list
      fetchUsers();
    } catch (err) {
      console.error('Error creating admin:', err);
      setFormError(err.response?.data?.message || 'Failed to create admin user');
    }
  };

  return (
    <div className="admin-users-container">
      <h1>User Management</h1>
      
      {error && <div className="error-message">{error}</div>}
      {formSuccess && <div className="success-message">{formSuccess}</div>}
      
      <div className="admin-controls">
        <div className="search-container">
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={handleSearchChange}
          />
          <button onClick={() => fetchUsers()}>Search</button>
        </div>
        
        <button onClick={() => navigate('/admin/dashboard')}>Back to Dashboard</button>
      </div>
      
      <div className="create-admin-section">
        <h2>Create New Admin</h2>
        {formError && <div className="error-message">{formError}</div>}
        
        <form onSubmit={handleNewAdminSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={newAdminForm.name}
              onChange={(e) => setNewAdminForm({...newAdminForm, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={newAdminForm.email}
              onChange={(e) => setNewAdminForm({...newAdminForm, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={newAdminForm.password}
              onChange={(e) => setNewAdminForm({...newAdminForm, password: e.target.value})}
              required
              minLength="8"
            />
          </div>
          <button type="submit">Create Admin</button>
        </form>
      </div>
      
      <h2>Users List</h2>
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <>
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.verified ? 'Yes' : 'No'}</td>
                  <td>{new Date(user.created_at).toLocaleString()}</td>
                  <td>
                    <select
                      value={user.role}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      disabled={user.id === JSON.parse(localStorage.getItem('user') || '{}').id}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === JSON.parse(localStorage.getItem('user') || '{}').id}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminUsers;
