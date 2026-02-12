import Avatar from '../../../../components/Avatar';
import type { AuditLog, UserSecurityInfo } from '../types';

type UserSecurityModalProps = {
  open: boolean;
  selectedUser: UserSecurityInfo | null;
  userAuditLogs: AuditLog[];
  onClose: () => void;
  onOpenResetPassword: () => void;
  onOpenResetEmail: () => void;
  onToggleUserLock: () => void;
};

export default function UserSecurityModal({
  open,
  selectedUser,
  userAuditLogs,
  onClose,
  onOpenResetPassword,
  onOpenResetEmail,
  onToggleUserLock,
}: UserSecurityModalProps) {
  if (!open || !selectedUser) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">User Security Details</h3>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar
                src={selectedUser.profilePicture}
                firstName={selectedUser.firstName}
                lastName={selectedUser.lastName}
                size="lg"
              />
              <div>
                <h4 className="text-xl font-semibold text-gray-900">
                  {selectedUser.firstName} {selectedUser.lastName}
                </h4>
                <p className="text-gray-500">{selectedUser.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedUser.role}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    selectedUser.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {selectedUser.isLocked && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      Locked
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Last Login</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('en-CA') : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Last Password Change</p>
                <p className="text-sm font-medium text-gray-900">
                  {selectedUser.lastPasswordChange
                    ? new Date(selectedUser.lastPasswordChange).toLocaleString('en-CA')
                    : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Failed Login Attempts</p>
                <p className="text-sm font-medium text-gray-900">{selectedUser.failedLoginAttempts}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Account Created</p>
                <p className="text-sm font-medium text-gray-900">{new Date(selectedUser.createdAt).toLocaleString('en-CA')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onOpenResetPassword}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
              >
                Reset Password
              </button>
              <button
                type="button"
                onClick={onOpenResetEmail}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200"
              >
                Change Email
              </button>
              <button
                type="button"
                onClick={onToggleUserLock}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  selectedUser.isLocked
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {selectedUser.isLocked ? 'Unlock Account' : 'Lock Account'}
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Recent Activity</h4>
              {userAuditLogs.length > 0 ? (
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 max-h-64 overflow-y-auto">
                  {userAuditLogs.map((log) => (
                    <div key={log.id} className="p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{log.action}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(log.createdAt).toLocaleString('en-CA')}
                        </span>
                      </div>
                      {log.details && <p className="text-gray-600 mt-1">{log.details}</p>}
                      <p className="text-xs text-gray-400 mt-1">IP: {log.ipAddress}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No recent activity logs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
