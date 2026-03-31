'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    if (status === 'authenticated' && session.user.role === 'user') router.push('/');
  }, [status, session, router]);

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    if (res.ok) {
      const data = await res.json();
      setUsers(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (session) fetchUsers();
  }, [session]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: newUsername, password: newPassword, targetRole: newRole }),
    });
    const data = await res.json();
    setCreating(false);

    if (!res.ok) {
      toast.error(data.error || 'Failed to create user');
    } else {
      toast.success(`User "${newUsername}" created!`);
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      setShowCreateForm(false);
      fetchUsers();
    }
  };

  const deleteUser = async (user: User) => {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;

    const res = await fetch(`/api/users?id=${user.id}`, { method: 'DELETE' });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Failed to delete user');
    } else {
      toast.success(`User "${user.username}" deleted`);
      fetchUsers();
    }
  };

  const changeRole = async (user: User, newRole: string) => {
    const res = await fetch('/api/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId: user.id, newRole }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error || 'Failed to change role');
    } else {
      toast.success(`${user.username} is now ${newRole}`);
      fetchUsers();
    }
  };

  const roleBadge = (role: string) => {
    const styles: Record<string, string> = {
      super_admin: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
      admin: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
      user: 'bg-gray-500/20 text-gray-300 border border-gray-500/30',
    };
    return styles[role] || styles.user;
  };

  const statusDot = (status: string) => {
    if (status === 'online') return 'bg-green-400';
    if (status === 'in_game') return 'bg-red-400';
    if (status === 'challenge_pending') return 'bg-yellow-400';
    return 'bg-gray-500';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const isSuperAdmin = session.user.role === 'super_admin';

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-white text-sm mb-2 flex items-center gap-1 transition-colors"
            >
              ← Back to Lobby
            </button>
            <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
            <p className="text-gray-400 text-sm mt-1">Manage users and permissions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-medium hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25"
          >
            + Create User
          </button>
        </div>

        {/* Create User Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-6 w-full max-w-md animate-slide-up">
              <h2 className="text-xl font-bold mb-6">Create New User</h2>
              <form onSubmit={createUser} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Username</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter username"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter password"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">User</option>
                    {isSuperAdmin && <option value="admin">Admin</option>}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-700 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-semibold">All Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-xs text-gray-400 uppercase tracking-wide">
                  <th className="text-left p-4">User</th>
                  <th className="text-left p-4">Role</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-left p-4">Joined</th>
                  <th className="text-right p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="p-4">
                      <div className="font-medium">{user.username}</div>
                      {user.id === session.user.id && (
                        <div className="text-xs text-indigo-400">(You)</div>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${roleBadge(user.role)}`}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusDot(user.status)}`} />
                        <span className="text-sm text-gray-300 capitalize">{user.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      {user.id !== session.user.id && user.role !== 'super_admin' && (
                        <div className="flex items-center justify-end gap-2">
                          {isSuperAdmin && (
                            <button
                              onClick={() => changeRole(user, user.role === 'admin' ? 'user' : 'admin')}
                              className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors border border-blue-500/20"
                            >
                              {user.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                          )}
                          {(isSuperAdmin || user.role === 'user') && (
                            <button
                              onClick={() => deleteUser(user)}
                              className="text-xs px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors border border-red-500/20"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
