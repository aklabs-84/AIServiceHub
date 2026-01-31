'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { updateUserRole, UserProfile } from '@/lib/db';
import { useRouter } from 'next/navigation';
import { FaUserShield, FaUser } from 'react-icons/fa';

type AdminUsersClientProps = {
  initialUserId: string | null;
  initialIsAdmin: boolean;
  initialUsers: UserProfile[];
};

export default function AdminUsersClient({
  initialUserId,
  initialIsAdmin,
  initialUsers,
}: AdminUsersClientProps) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { showError } = useToast();
  const router = useRouter();
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !isAdmin) {
      router.push('/');
      return;
    }
    const currentUserId = user?.id ?? null;
    if (currentUserId !== initialUserId || isAdmin !== initialIsAdmin) {
      setLoading(true);
      router.refresh();
      setLoading(false);
    }
  }, [user, isAdmin, authLoading, router, initialUserId, initialIsAdmin]);

  useEffect(() => {
    setUsers(initialUsers);
  }, [initialUsers]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!confirm(`${newRole === 'admin' ? '관리자' : '사용자'} 권한을 부여하시겠습니까?`)) return;

    setUpdating(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u));
    } catch (error) {
      console.error('Error updating role:', error);
      showError('권한 변경 중 오류가 발생했습니다.');
    } finally {
      setUpdating(null);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
          <FaUserShield className="text-blue-600 dark:text-blue-300 text-2xl" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            사용자 관리
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            사용자 목록을 조회하고 권한을 관리합니다.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-4 font-semibold">사용자</th>
                <th className="px-6 py-4 font-semibold">이메일</th>
                <th className="px-6 py-4 font-semibold">가입일</th>
                <th className="px-6 py-4 font-semibold">권한</th>
              </tr>
            </thead>
            <tbody>
              {users.map((profile) => (
                <tr key={profile.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 overflow-hidden">
                        <FaUser className="text-xs" />
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {profile.displayName || '이름 없음'}
                      </span>
                      {profile.id === user?.id && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">나</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm">
                    {profile.email || '-'}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 text-sm">
                    {profile.createdAt?.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={profile.role || 'user'}
                      onChange={(e) => handleRoleChange(profile.id, e.target.value)}
                      disabled={updating === profile.id || profile.id === user?.id}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${profile.role === 'admin'
                          ? 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800'
                          : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                        } ${updating === profile.id ? 'opacity-50 cursor-wait' : ''}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {users.length === 0 && (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            사용자가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
