/**
 * UserManagement Component
 * Admin-only component for managing users and permissions
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Avatar from './Avatar';
import ErrorBanner from './ErrorBanner';
import { useApiError } from '../hooks/useApiError';
import { validatePassword } from '../utils/validation';
import type { RoleSelectorItem } from '../features/adminOps/contracts';
import {
  buildRoleLabelMap,
  getRoleDisplayLabel,
} from '../features/adminOps/pages/adminSettings/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  profilePicture?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  password: string;
  confirmPassword: string;
}

const initialFormData: UserFormData = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'staff',
  password: '',
  confirmPassword: '',
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<RoleSelectorItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error, details, setFromError, clear } = useApiError();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const {
    error: formError,
    details: formDetails,
    setFromError: setFormErrorFromError,
    clear: clearFormError,
  } = useApiError();
  const [isSaving, setIsSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (!showInactive) params.append('is_active', 'true');

      const response = await api.get(`/users?${params.toString()}`);
      setUsers(response.data.users);
      clear();
    } catch {
      setFromError(new Error('Failed to load users'), 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, roleFilter, showInactive, clear, setFromError]);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await api.get('/users/roles');
      setRoles(response.data.roles);
    } catch {
      setRoles([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleCreateUser = async () => {
    clearFormError();

    if (formData.password !== formData.confirmPassword) {
      setFormErrorFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setFormErrorFromError(new Error(passwordError), passwordError);
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/users', {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        password: formData.password,
      });
      setShowCreateModal(false);
      setFormData(initialFormData);
      fetchUsers();
    } catch (err: unknown) {
      setFormErrorFromError(err, 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    clearFormError();
    setIsSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}`, {
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      });
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData(initialFormData);
      fetchUsers();
    } catch (err: unknown) {
      setFormErrorFromError(err, 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    clearFormError();

    if (formData.password !== formData.confirmPassword) {
      setFormErrorFromError(new Error('Passwords do not match'), 'Passwords do not match');
      return;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setFormErrorFromError(new Error(passwordError), passwordError);
      return;
    }

    setIsSaving(true);
    try {
      await api.put(`/users/${selectedUser.id}/password`, {
        password: formData.password,
      });
      setShowResetPasswordModal(false);
      setSelectedUser(null);
      setFormData(initialFormData);
    } catch (err: unknown) {
      setFormErrorFromError(err, 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: unknown) {
      setFromError(err, 'Failed to update user status');
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      password: '',
      confirmPassword: '',
    });
    clearFormError();
    setShowEditModal(true);
  };

  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ ...initialFormData });
    clearFormError();
    setShowResetPasswordModal(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-app-accent-soft text-app-accent-text';
      case 'manager':
      case 'staff':
      case 'volunteer':
      case 'viewer':
        return 'bg-app-surface-muted text-app-text';
      default:
        return 'bg-app-accent-soft text-app-accent-text';
    }
  };

  const roleLabelMap = buildRoleLabelMap(roles);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-app-text-heading">Users & Permissions</h2>
          <p className="text-sm text-app-text-muted">Manage user accounts and access levels</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setFormData(initialFormData);
            clearFormError();
            setShowCreateModal(true);
          }}
          className="inline-flex items-center px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-medium rounded-lg hover:bg-app-accent-hover focus:outline-none focus:ring-2 focus:ring-app-accent focus:ring-offset-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent focus:border-transparent"
        >
          <option value="">All Roles</option>
          {roles.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center px-3 py-2 bg-app-surface-muted rounded-lg cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-app-text-muted">Show inactive</span>
        </label>
      </div>

      {/* Error message */}
      <ErrorBanner message={error} correlationId={details?.correlationId} />

      {/* Users list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-app-accent"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-app-text-muted">
          No users found
        </div>
      ) : (
        <div className="bg-app-surface rounded-lg border border-app-border overflow-hidden">
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-app-surface-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-app-text-muted uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-app-surface divide-y divide-app-border">
              {users.map((user) => (
                <tr key={user.id} className={!user.isActive ? 'bg-app-surface-muted' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar
                        src={user.profilePicture}
                        firstName={user.firstName}
                        lastName={user.lastName}
                        size="md"
                      />
                      <div className="ml-4">
                        <div className="text-sm font-medium text-app-text">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-app-text-muted">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleDisplayLabel(user.role, roleLabelMap)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.isActive ? 'bg-app-accent-soft text-app-accent-text' : 'bg-app-accent-soft text-app-accent-text'
                    }`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      type="button"
                      onClick={() => openEditModal(user)}
                      className="text-app-accent hover:text-app-accent-hover mr-3"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => openResetPasswordModal(user)}
                      className="text-app-text-muted hover:text-app-text mr-3"
                    >
                      Reset Password
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(user)}
                      className={user.isActive ? 'text-app-accent hover:text-app-accent-text' : 'text-app-accent hover:text-app-accent-text'}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 app-popup-backdrop" onClick={() => setShowCreateModal(false)} />
            <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">Create New User</h3>

              <ErrorBanner
                message={formError}
                correlationId={formDetails?.correlationId}
                className="mb-4"
              />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  >
                    {roles.length === 0 ? (
                      <option value={formData.role}>
                        {getRoleDisplayLabel(formData.role, roleLabelMap)}
                      </option>
                    ) : (
                      roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                  <p className="mt-1 text-xs text-app-text-muted">
                    Min 8 chars with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Confirm Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-app-text-muted hover:bg-app-hover rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateUser}
                  disabled={isSaving}
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {isSaving ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 app-popup-backdrop" onClick={() => setShowEditModal(false)} />
            <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">Edit User</h3>

              <ErrorBanner
                message={formError}
                correlationId={formDetails?.correlationId}
                className="mb-4"
              />

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">First Name</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-app-text-label mb-1">Last Name</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                      className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  >
                    {roles.length === 0 ? (
                      <option value={formData.role}>
                        {getRoleDisplayLabel(formData.role, roleLabelMap)}
                      </option>
                    ) : (
                      roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label} - {role.description}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-app-text-muted hover:bg-app-hover rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateUser}
                  disabled={isSaving}
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 app-popup-backdrop" onClick={() => setShowResetPasswordModal(false)} />
            <div className="relative bg-app-surface rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-app-text-heading mb-4">
                Reset Password for {selectedUser.firstName} {selectedUser.lastName}
              </h3>

              <ErrorBanner
                message={formError}
                correlationId={formDetails?.correlationId}
                className="mb-4"
              />

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">New Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                  <p className="mt-1 text-xs text-app-text-muted">
                    Min 8 chars with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-app-text-label mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-app-input-border rounded-lg bg-app-input-bg text-app-text focus:outline-none focus:ring-2 focus:ring-app-accent"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 text-app-text-muted hover:bg-app-hover rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={isSaving}
                  className="px-4 py-2 bg-app-accent text-[var(--app-accent-foreground)] rounded-lg hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {isSaving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
