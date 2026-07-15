'use client';

import React, { useEffect, useState } from 'react';
import { useProfile } from '@/providers/ProfileProvider';
import { createClient } from '@/utils/supabase/client';
import { createClient as createSignUpClient } from '@supabase/supabase-js';
import { Loader2, Plus, Trash2, Edit2, ShieldAlert, Check } from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'owner' | 'admin' | 'staff';
  created_at: string;
}

export default function UsersPage() {
  const { profile } = useProfile();
  const supabase = createClient();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelection, setRoleSelection] = useState<'admin' | 'staff'>('staff');
  const [formLoading, setFormLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<'owner' | 'admin' | 'staff'>('staff');

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setUsers(data as UserProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'owner') {
      fetchUsers();
    }
  }, [profile]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!fullName || !email || !password) {
      setErrorMsg('All fields are required.');
      setFormLoading(false);
      return;
    }

    try {
      // Create a secondary supabase client that doesn't persist the session
      // so it doesn't log the Owner out
      const signUpClient = createSignUpClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );

      const { data, error } = await signUpClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: roleSelection,
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccessMsg(`User ${fullName} registered successfully!`);
        setFullName('');
        setEmail('');
        setPassword('');
        setShowAddForm(false);
        fetchUsers();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to create user.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: editRole })
      .eq('id', userId);

    if (error) {
      alert(error.message);
    } else {
      setEditingUserId(null);
      fetchUsers();
    }
  };

  const handleDeleteUser = async (userId: string, targetRole: string) => {
    if (targetRole === 'owner') {
      alert('Cannot delete the owner account!');
      return;
    }

    if (confirm('Are you sure you want to delete this user? This will remove their profile and access.')) {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        alert(error.message);
      } else {
        fetchUsers();
      }
    }
  };

  if (profile?.role !== 'owner') {
    return (
      <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center text-red-400">
        <ShieldAlert className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-bold text-white mb-2">Access Denied</h2>
        <p className="text-sm">Only the system Owner has permission to access User Management.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">User Accounts</h2>
          <p className="text-xs text-zinc-400">Manage credentials and roles for staff and administrators.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 transition-colors"
        >
          <Plus size={16} />
          Add User
        </button>
      </div>

      {/* Add User Form Card */}
      {showAddForm && (
        <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-6 shadow-xl max-w-lg">
          <h3 className="text-base font-bold text-white mb-4">Create New Account</h3>
          
          {errorMsg && (
            <div className="mb-4 rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-400">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full Name"
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@thennakoontours.com"
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Role</label>
              <select
                value={roleSelection}
                onChange={(e) => setRoleSelection(e.target.value as any)}
                className="block w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2.5 px-4 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="staff">Staff (Create Quotations only)</option>
                <option value="admin">Admin (Manage Rates and Vehicles)</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={formLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 disabled:opacity-50"
              >
                {formLoading ? <Loader2 size={16} className="animate-spin text-black" /> : 'Create Account'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-green-950/20 border border-green-900/50 p-4 text-sm text-green-400">
          {successMsg}
        </div>
      )}

      {/* Users List Table */}
      <div className="bg-[#151516] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created Date</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 text-sm text-zinc-300">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-900/30">
                    <td className="px-6 py-4 font-medium text-white">{u.full_name}</td>
                    <td className="px-6 py-4">{u.email}</td>
                    <td className="px-6 py-4">
                      {editingUserId === u.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as any)}
                            className="rounded-lg border border-zinc-800 bg-zinc-950 py-1.5 px-3 text-xs text-white"
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="staff">Staff</option>
                          </select>
                          <button
                            onClick={() => handleUpdateRole(u.id)}
                            className="p-1.5 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.role === 'owner' 
                            ? 'bg-yellow-500/10 text-primary' 
                            : u.role === 'admin' 
                            ? 'bg-blue-500/10 text-blue-400' 
                            : 'bg-zinc-800 text-zinc-400'
                        }`}>
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'owner' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditRole(u.role);
                            }}
                            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
                            title="Edit Role"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.role)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400"
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
