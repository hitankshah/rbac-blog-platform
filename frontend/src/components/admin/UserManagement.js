import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import './Dashboard.css';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line
  }, [pagination.page, pagination.limit, searchQuery]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(pagination.page, pagination.limit, searchQuery);

      setUsers(response.data.users);
      setPagination({
        page: response.data.pagination.page,
        limit: response.data.pagination.limit,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages,
      });
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchUsers();
  };

  const handleRoleChange = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    try {
      await adminService.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(user => user.id === userId ? { ...user, role: newRole } : user));
      setMessage({ text: `User role updated to ${newRole} successfully`, type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      console.error('Error updating role:', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to update user role',
        type: 'error'
      });
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteConfirmation(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmation) return;

    try {
      await adminService.deleteUser(deleteConfirmation.id);
      setUsers(prev => prev.filter(user => user.id !== deleteConfirmation.id));
      setMessage({ text: 'User deleted successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      console.error('Error deleting user:', err);
      setMessage({
        text: err.response?.data?.message || 'Failed to delete user',
        type: 'error'
      });
    } finally {
      setDeleteConfirmation(null);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading && users.length === 0) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div>
      <div className="dashboard-header">
        <h1>User Management</h1>
        <p>Manage users and permissions</p>
      </div>

      {message.text && (
        <div className={`alert alert-${message.type}`}>{message.text}</div>
      )}

      <div className="search-filters">
        <form onSubmit={handleSearch}>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <button type="submit">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </form>
      </div>

      {error ? (
        <div className="error-message">{error}</div>
      ) : users.length === 0 ? (
        <div className="no-results">
          <p>No users found. {searchQuery && 'Try a different search term.'}</p>
        </div>
      ) : (
        <>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className="timestamp">{formatDate(user.created_at)}</span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleRoleChange(user.id, user.role)}
                          title={`Change role to ${user.role === 'admin' ? 'user' : 'admin'}`}
                          className="action-edit"
                        >
                          <i className="fas fa-user-cog"></i>
                        </button>
                        <button
                          onClick={() => handleDeleteClick(user)}
                          title="Delete user"
                          className="action-delete"
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="pagination-prev"
                disabled={pagination.page === 1}
                onClick={() => handlePageChange(pagination.page - 1)}
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              <span className="pagination-info">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="pagination-next"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmation && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
            </div>
            <div className="modal-body">
              Are you sure you want to delete the user <strong>{deleteConfirmation.name}</strong>?
              This action cannot be undone.
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-cancel"
                onClick={() => setDeleteConfirmation(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-delete"
                onClick={handleDeleteConfirm}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
