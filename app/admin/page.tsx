'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { supabase } from '@/lib/supabase';
import { createCategory, deleteCategory, getAllApps, getAllComments, getAllPrompts, getAllUsers, getCategoriesByType, updateCategory, UserProfile } from '@/lib/db';
import { AIApp } from '@/types/app';
import { Prompt } from '@/types/prompt';
import { Comment } from '@/types/comment';
import { CategoryRecord } from '@/types/category';
import { appCategoryDefaults, appColorOptions, appIconOptions, promptCategoryDefaults, promptColorOptions, promptIconOptions } from '@/lib/categoryOptions';
import { FaUsers, FaRobot, FaRegCommentDots, FaListUl, FaLock, FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import Link from 'next/link';

interface CreatorStat {
  userId: string;
  name: string;
  apps: number;
  prompts: number;
  comments: number;
}

type TabKey = 'creators' | 'apps' | 'prompts' | 'users' | 'categories';

interface OneTimeInfo {
  id: string;
  username: string;
  password: string;
  createdAt: string | null;
  usedAt: string | null;
  sessionExpiresAt: string | null;
  durationHours: number | null;
}

const AdminPage = dynamic(() => Promise.resolve(AdminPageContent), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

export default AdminPage;

function AdminPageContent() {
  const { user, isAdmin, loading, signInWithGoogle, signOut } = useAuth();
  const { showSuccess, showError, showInfo } = useToast();
  const [apps, setApps] = useState<AIApp[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('creators');
  const [pageCreators, setPageCreators] = useState(1);
  const [pageApps, setPageApps] = useState(1);
  const [pagePrompts, setPagePrompts] = useState(1);
  const [pageUsers, setPageUsers] = useState(1);
  const [appCategories, setAppCategories] = useState<CategoryRecord[]>([]);
  const [promptCategories, setPromptCategories] = useState<CategoryRecord[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryEdits, setCategoryEdits] = useState<Record<string, { label: string; color: string; icon: string }>>({});
  const [autoSeededApp, setAutoSeededApp] = useState(false);
  const [autoSeededPrompt, setAutoSeededPrompt] = useState(false);
  const [oneTimeInfo, setOneTimeInfo] = useState<OneTimeInfo[]>([]);
  const [oneTimeCredential, setOneTimeCredential] = useState<{ username: string; password: string } | null>(null);
  const [oneTimeLoading, setOneTimeLoading] = useState(false);
  const [oneTimeError, setOneTimeError] = useState<string | null>(null);
  const [oneTimePage, setOneTimePage] = useState(1);
  const [showOneTimeModal, setShowOneTimeModal] = useState(false);
  const [editingOneTime, setEditingOneTime] = useState<OneTimeInfo | null>(null);
  const [oneTimeForm, setOneTimeForm] = useState({
    username: '',
    password: '',
    durationUnit: 'hour' as 'hour' | 'day' | 'week',
  });
  const [now, setNow] = useState<Date | null>(null);
  const [appCategoryForm, setAppCategoryForm] = useState({
    value: '',
    label: '',
    color: appColorOptions[0],
    icon: Object.keys(appIconOptions)[0] || 'puzzle',
  });
  const [promptCategoryForm, setPromptCategoryForm] = useState({
    value: '',
    label: '',
    color: promptColorOptions[0],
    icon: Object.keys(promptIconOptions)[0] || 'smile',
  });

  const pageSize = 10;

  useEffect(() => {
    if (!user || !isAdmin) return;
    const fetchAll = async () => {
      setLoadingData(true);
      try {
        const [appsData, promptsData, commentsData, usersData] = await Promise.all([
          getAllApps(),
          getAllPrompts(),
          getAllComments(),
          getAllUsers(),
        ]);
        setApps(appsData);
        setPrompts(promptsData);
        setComments(commentsData);
        setUsers(usersData);
      } catch (err) {
        console.error('Failed to load admin data', err);
        showError('관리자 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchAll();
  }, [user, isAdmin]);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const [appsData, promptsData] = await Promise.all([
        getCategoriesByType('app'),
        getCategoriesByType('prompt'),
      ]);
      setAppCategories(appsData);
      setPromptCategories(promptsData);
      const nextEdits: Record<string, { label: string; color: string; icon: string }> = {};
      [...appsData, ...promptsData].forEach((item) => {
        nextEdits[item.id] = { label: item.label, color: item.color, icon: item.icon };
      });
      setCategoryEdits(nextEdits);
    } catch (error) {
      console.error('Failed to load categories:', error);
      showError('카테고리를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadOneTimeInfo = useCallback(async () => {
    if (!user || !isAdmin) return;
    setOneTimeError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const response = await fetch('/api/one-time/credentials', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load');
      }
      setOneTimeInfo(data.items || []);
    } catch (error) {
      console.error('Failed to load one-time info:', error);
      setOneTimeError('일회용 계정 정보를 불러오지 못했습니다.');
    }
  }, [user]);

  const handleSeedFromData = useCallback(async (type: 'app' | 'prompt') => {
    const defaults = type === 'app' ? appCategoryDefaults : promptCategoryDefaults;
    const existing = type === 'app' ? appCategories : promptCategories;
    const existingValues = new Set(existing.map((item) => item.value));
    const sourceValues = new Set(
      (type === 'app' ? apps : prompts).map((item) => item.category).filter(Boolean)
    );
    if (sourceValues.size === 0) {
      showInfo('등록된 데이터에서 카테고리를 찾을 수 없습니다.');
      return;
    }
    setSavingCategory(true);
    try {
      for (const value of sourceValues) {
        if (existingValues.has(value)) continue;
        const match = defaults.find((item) => item.value === value);
        await createCategory({
          type,
          value,
          label: match?.label || value,
          color: match?.color || (type === 'app' ? appColorOptions[0] : promptColorOptions[0]),
          icon: match?.icon || (type === 'app' ? Object.keys(appIconOptions)[0] : Object.keys(promptIconOptions)[0]),
        });
      }
      await loadCategories();
    } catch (error) {
      console.error('Failed to seed categories from data:', error);
      showError('카테고리 가져오기 중 오류가 발생했습니다.');
    } finally {
      setSavingCategory(false);
    }
  }, [
    appCategories,
    promptCategories,
    apps,
    prompts,
    loadCategories,
  ]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadCategories();
  }, [user, isAdmin, loadCategories]);

  useEffect(() => {
    loadOneTimeInfo();
  }, [loadOneTimeInfo]);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    if (!autoSeededApp && appCategories.length === 0 && apps.length > 0) {
      setAutoSeededApp(true);
      handleSeedFromData('app');
    }
  }, [user, autoSeededApp, appCategories.length, apps.length, handleSeedFromData]);

  useEffect(() => {
    if (!user || !isAdmin) return;
    if (!autoSeededPrompt && promptCategories.length === 0 && prompts.length > 0) {
      setAutoSeededPrompt(true);
      handleSeedFromData('prompt');
    }
  }, [user, autoSeededPrompt, promptCategories.length, prompts.length, handleSeedFromData]);

  const handleCreateCategory = async (type: 'app' | 'prompt') => {
    const form = type === 'app' ? appCategoryForm : promptCategoryForm;
    const existing = type === 'app' ? appCategories : promptCategories;

    if (!form.value.trim() || !form.label.trim()) {
      showError('값과 라벨을 입력해주세요.');
      return;
    }

    // 클라이언트 사이드 중복 체크
    if (existing.some(c => c.value === form.value.trim())) {
      showError(`이미 존재하는 '${form.value}' 값입니다.`);
      return;
    }

    setSavingCategory(true);
    try {
      await createCategory({
        type,
        value: form.value.trim(),
        label: form.label.trim(),
        color: form.color,
        icon: form.icon,
      });
      if (type === 'app') {
        setAppCategoryForm((prev) => ({ ...prev, value: '', label: '' }));
      } else {
        setPromptCategoryForm((prev) => ({ ...prev, value: '', label: '' }));
      }
      await loadCategories();
      showSuccess('카테고리가 성공적으로 추가되었습니다.');
    } catch (error) {
      console.error('Failed to create category:', error);
      showError('카테고리 추가 중 오류가 발생했습니다. (중복된 값이거나 권한 문제일 수 있습니다)');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleGenerateOneTime = async () => {
    if (!user) return;
    setOneTimeLoading(true);
    setOneTimeError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const response = await fetch('/api/one-time/credentials', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: oneTimeForm.username.trim(),
          password: oneTimeForm.password.trim(),
          durationHours: oneTimeForm.durationUnit === 'hour' ? 1 : oneTimeForm.durationUnit === 'day' ? 24 : 168,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to create');
      }
      setOneTimeCredential({ username: data.username, password: data.password });
      await loadOneTimeInfo();
      setShowOneTimeModal(false);
      setOneTimeForm({ username: '', password: '', durationUnit: 'hour' });
    } catch (error) {
      console.error('Failed to generate one-time credentials:', error);
      setOneTimeError('일회용 계정 생성에 실패했습니다.');
    } finally {
      setOneTimeLoading(false);
    }
  };

  const handleDeleteOneTime = async (id: string) => {
    if (!user) return;
    if (!confirm('일회용 계정을 삭제하시겠습니까?')) return;
    setOneTimeLoading(true);
    setOneTimeError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const response = await fetch(`/api/one-time/credentials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to delete');
      }
      await loadOneTimeInfo();
    } catch (error) {
      console.error('Failed to delete one-time credentials:', error);
      setOneTimeError('일회용 계정 삭제에 실패했습니다.');
    } finally {
      setOneTimeLoading(false);
    }
  };

  const handleUpdateOneTime = async () => {
    if (!user || !editingOneTime) return;
    setOneTimeLoading(true);
    setOneTimeError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';
      const response = await fetch(`/api/one-time/credentials/${editingOneTime.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: oneTimeForm.username.trim(),
          password: oneTimeForm.password.trim(),
          durationHours: oneTimeForm.durationUnit === 'hour' ? 1 : oneTimeForm.durationUnit === 'day' ? 24 : 168,
        }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Failed to update');
      }
      await loadOneTimeInfo();
      setEditingOneTime(null);
      setShowOneTimeModal(false);
      setOneTimeForm({ username: '', password: '', durationUnit: 'hour' });
    } catch (error) {
      console.error('Failed to update one-time credentials:', error);
      setOneTimeError('일회용 계정 수정에 실패했습니다.');
    } finally {
      setOneTimeLoading(false);
    }
  };

  const handleDeleteCategory = async (category: CategoryRecord) => {
    if (!confirm(`'${category.label}' 카테고리를 삭제하시겠습니까?`)) return;
    try {
      await deleteCategory(category.id);
      await loadCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
      showError('카테고리 삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSeedDefaults = async (type: 'app' | 'prompt') => {
    const defaults = type === 'app' ? appCategoryDefaults : promptCategoryDefaults;
    const existing = type === 'app' ? appCategories : promptCategories;
    const existingValues = new Set(existing.map(c => c.value));

    setSavingCategory(true);
    let addedCount = 0;
    try {
      for (const item of defaults) {
        // 이미 존재하는 value는 건너뜀
        if (existingValues.has(item.value)) continue;

        await createCategory({
          type,
          value: item.value,
          label: item.label,
          color: item.color,
          icon: item.icon,
        });
        addedCount++;
      }
      await loadCategories();
      if (addedCount > 0) {
        showSuccess(`${addedCount}개의 기본 카테고리가 추가되었습니다.`);
      } else {
        showInfo('이미 모든 기본 카테고리가 등록되어 있습니다.');
      }
    } catch (error) {
      console.error('Failed to seed categories:', error);
      showError('기본 카테고리 추가 중 오류가 발생했습니다.');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleUpdateCategory = async (category: CategoryRecord) => {
    const edit = categoryEdits[category.id];
    if (!edit) return;
    if (edit.label === category.label && edit.color === category.color && edit.icon === category.icon) {
      return;
    }
    setSavingCategory(true);
    try {
      await updateCategory(category.id, edit);
      await loadCategories();
      showSuccess('카테고리가 수정되었습니다.');
    } catch (error) {
      console.error('Failed to update category:', error);
      showError('카테고리 수정 중 오류가 발생했습니다. (권한 문제일 수 있습니다)');
    } finally {
      setSavingCategory(false);
    }
  };

  const creatorStats = useMemo(() => {
    const stats = new Map<string, CreatorStat>();
    const seed = (userId: string, name?: string) => {
      if (!stats.has(userId)) {
        stats.set(userId, { userId, name: name || '익명', apps: 0, prompts: 0, comments: 0 });
      }
    };
    users.forEach((u) => seed(u.id, u.displayName || u.email || '익명'));

    const add = (userId: string | undefined, name: string | undefined, type: 'app' | 'prompt' | 'comment') => {
      if (!userId) return;
      seed(userId, name);
      const current = stats.get(userId)!;
      if (type === 'app') current.apps += 1;
      if (type === 'prompt') current.prompts += 1;
      if (type === 'comment') current.comments += 1;
    };

    apps.forEach((item) => add(item.createdBy, item.createdByName, 'app'));
    prompts.forEach((item) => add(item.createdBy, item.createdByName, 'prompt'));
    comments.forEach((item) => add(item.createdBy, item.createdByName, 'comment'));

    return Array.from(stats.values()).sort((a, b) => b.apps + b.prompts + b.comments - (a.apps + a.prompts + a.comments));
  }, [apps, prompts, comments, users]);

  const paginated = <T,>(items: T[], page: number) => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  };

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);

  const recentDaily = useMemo(() => {
    if (!now) return [];
    const today = new Date(now);
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Array.from({ length: 7 }, (_, idx) => {
      const d = new Date();
      d.setDate(today.getDate() - (6 - idx));
      return d;
    });
    const countByDay = (items: { createdAt: Date }[]) => {
      const map = new Map<number, number>();
      items.forEach((item) => {
        const day = startOfDay(item.createdAt);
        map.set(day, (map.get(day) || 0) + 1);
      });
      return map;
    };
    const appMap = countByDay(apps);
    const promptMap = countByDay(prompts);
    const commentMap = countByDay(comments);

    return days.map((d) => {
      const key = startOfDay(d);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      return {
        label,
        apps: appMap.get(key) || 0,
        prompts: promptMap.get(key) || 0,
        comments: commentMap.get(key) || 0,
      };
    });
  }, [apps, prompts, comments, now]);

  const topCreators = useMemo(() => creatorStats.slice(0, 10), [creatorStats]);
  const recentUsers = useMemo(
    () =>
      [...users]
        .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))
        .slice(0, 12),
    [users]
  );

  const totalPagesCreators = Math.max(1, Math.ceil(creatorStats.length / pageSize));
  const totalPagesApps = Math.max(1, Math.ceil(apps.length / pageSize));
  const totalPagesPrompts = Math.max(1, Math.ceil(prompts.length / pageSize));
  const totalPagesUsers = Math.max(1, Math.ceil(recentUsers.length / pageSize));
  const totalPagesOneTime = Math.max(1, Math.ceil(oneTimeInfo.length / pageSize));
  const pagedOneTime = paginated(oneTimeInfo, oneTimePage);
  const formatOneTimeStatus = (item: OneTimeInfo) => {
    if (!now) return '확인 중';
    if (item.sessionExpiresAt && new Date(item.sessionExpiresAt).getTime() > now.getTime()) {
      return '로그인 활성';
    }
    if (item.usedAt) return '사용 완료';
    return '미사용';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">관리자 로그인 필요</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">관리자만 접근할 수 있습니다. 구글 계정으로 로그인하세요.</p>
        <button
          onClick={signInWithGoogle}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          Google 로그인
        </button>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-red-50 text-red-500 mb-4">
          <FaLock size={28} />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">접근 권한이 없습니다</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">관리자 전용 페이지입니다.</p>
        <button
          onClick={signOut}
          className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-100 px-5 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition"
        >
          다른 계정으로 로그인
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">관리자 대시보드</h1>
          <p className="text-gray-600 dark:text-gray-400">가입자, 앱/프롬프트, 댓글 현황을 한 눈에 확인하세요.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/users"
            className="text-sm px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition font-semibold"
          >
            유저 권한 관리
          </Link>
          <button
            onClick={signOut}
            className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            로그아웃
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FaUsers />} label="활성 작성자" value={creatorStats.length} />
        <StatCard icon={<FaRobot />} label="앱" value={apps.length} />
        <StatCard icon={<FaListUl />} label="프롬프트" value={prompts.length} />
        <StatCard icon={<FaRegCommentDots />} label="댓글" value={comments.length} />
      </div>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">일회용 로그인 관리</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">ID/PW로 한 번만 로그인해 전체 콘텐츠를 볼 수 있습니다.</p>
          </div>
          <Link href="/one-time-login" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            로그인 링크
          </Link>
        </div>
        <div className="px-4 py-5 space-y-4">
          {oneTimeCredential && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              새로 생성된 일회용 계정입니다. 지금만 확인할 수 있어요.
              <div className="mt-2 font-semibold">
                ID: {oneTimeCredential.username} / PW: {oneTimeCredential.password}
              </div>
            </div>
          )}
          {oneTimeError && (
            <p className="text-sm text-red-500">{oneTimeError}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingOneTime(null);
                setOneTimeForm({ username: '', password: '', durationUnit: 'hour' });
                setShowOneTimeModal(true);
              }}
              disabled={oneTimeLoading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
            >
              일회용 ID/PW 생성
            </button>
            <button
              type="button"
              onClick={loadOneTimeInfo}
              disabled={oneTimeLoading}
              className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60"
            >
              상태 새로고침
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">ID</th>
                  <th className="px-4 py-3 text-left font-semibold">PW</th>
                  <th className="px-4 py-3 text-left font-semibold">상태</th>
                  <th className="px-4 py-3 text-left font-semibold">생성일</th>
                  <th className="px-4 py-3 text-left font-semibold">만료</th>
                  <th className="px-4 py-3 text-right font-semibold">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pagedOneTime.map((item) => (
                  <tr key={item.id} className="text-gray-700 dark:text-gray-200">
                    <td className="px-4 py-3">{item.username}</td>
                    <td className="px-4 py-3">{item.password}</td>
                    <td className="px-4 py-3">{formatOneTimeStatus(item)}</td>
                    <td className="px-4 py-3">{item.createdAt ? new Date(item.createdAt).toLocaleString('ko-KR') : '-'}</td>
                    <td className="px-4 py-3">{item.sessionExpiresAt ? new Date(item.sessionExpiresAt).toLocaleString('ko-KR') : '-'}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingOneTime(item);
                          setOneTimeForm({
                            username: item.username,
                            password: item.password,
                            durationUnit: item.durationHours === 24 ? 'day' : item.durationHours === 168 ? 'week' : 'hour',
                          });
                          setShowOneTimeModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <FaEdit />
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOneTime(item.id)}
                        className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-900/20"
                      >
                        <FaTrash />
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
                {pagedOneTime.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      등록된 일회용 계정이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <Pager page={oneTimePage} totalPages={totalPagesOneTime} onPageChange={setOneTimePage} />
          </div>
        </div>
      </section>

      {showOneTimeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {editingOneTime ? '일회용 계정 수정' : '일회용 계정 생성'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">ID</label>
                <input
                  type="text"
                  value={oneTimeForm.username}
                  onChange={(event) => setOneTimeForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">PW</label>
                <input
                  type="text"
                  value={oneTimeForm.password}
                  onChange={(event) => setOneTimeForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2">유지 기간</label>
                <select
                  value={oneTimeForm.durationUnit}
                  onChange={(event) => setOneTimeForm((prev) => ({ ...prev, durationUnit: event.target.value as 'hour' | 'day' | 'week' }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:outline-none"
                >
                  <option value="hour">시간 (1시간)</option>
                  <option value="day">일 (1일)</option>
                  <option value="week">주 (1주)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowOneTimeModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                취소
              </button>
              <button
                type="button"
                onClick={editingOneTime ? handleUpdateOneTime : handleGenerateOneTime}
                disabled={oneTimeLoading}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {editingOneTime ? '수정 완료' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">일간 생성 추이 (최근 7일)</h2>
        </div>
        <div className="px-4 py-5 overflow-x-auto">
          <MiniBarChart data={recentDaily} />
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-3">
            <Legend color="bg-blue-500" label="앱" />
            <Legend color="bg-emerald-500" label="프롬프트" />
            <Legend color="bg-purple-500" label="댓글" />
          </div>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-8">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">작성자 활동 그래프 (상위 10명)</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">앱/프롬프트/댓글 수를 한 눈에 비교하세요.</p>
          </div>
        </div>
        <div className="px-4 py-5">
          <CreatorActivityChart data={topCreators} />
          <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-3">
            <Legend color="bg-blue-500" label="앱" />
            <Legend color="bg-emerald-500" label="프롬프트" />
            <Legend color="bg-purple-500" label="댓글" />
          </div>
        </div>
      </section>

      {loadingData ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
              {[
                { key: 'creators', label: '작성자 활동' },
                { key: 'apps', label: '최신 앱' },
                { key: 'prompts', label: '최신 프롬프트' },
                { key: 'users', label: '신규 가입자' },
                { key: 'categories', label: '카테고리 관리' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === tab.key
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'creators' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">작성자</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">앱</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">프롬프트</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">댓글</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-200">총합</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {paginated(creatorStats, pageCreators).map((creator) => {
                      const total = creator.apps + creator.prompts + creator.comments;
                      return (
                        <tr key={creator.userId}>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                            <div className="font-semibold">{creator.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">UID: {creator.userId}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{creator.apps}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{creator.prompts}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{creator.comments}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{total}</td>
                        </tr>
                      );
                    })}
                    {creatorStats.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                          작성자가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <Pager
                  page={pageCreators}
                  totalPages={totalPagesCreators}
                  onPageChange={setPageCreators}
                />
              </div>
            )}

            {activeTab === 'apps' && (
              <div>
                <ListCard
                  title="앱"
                  items={paginated(apps, pageApps).map((app) => ({
                    id: app.id,
                    title: app.name,
                    subtitle: app.createdByName,
                    meta: formatDate(app.createdAt),
                  }))}
                />
                <Pager page={pageApps} totalPages={totalPagesApps} onPageChange={setPageApps} />
              </div>
            )}

            {activeTab === 'prompts' && (
              <div>
                <ListCard
                  title="프롬프트"
                  items={paginated(prompts, pagePrompts).map((prompt) => ({
                    id: prompt.id,
                    title: prompt.name,
                    subtitle: prompt.createdByName,
                    meta: formatDate(prompt.createdAt),
                  }))}
                />
                <Pager page={pagePrompts} totalPages={totalPagesPrompts} onPageChange={setPagePrompts} />
              </div>
            )}

            {activeTab === 'users' && (
              <div>
                <ListCard
                  title="신규 가입자"
                  items={paginated(recentUsers, pageUsers).map((u) => ({
                    id: u.id,
                    title: u.displayName || u.email || '이름 없음',
                    subtitle: u.email || '이메일 없음',
                    meta: u.createdAt ? formatDate(u.createdAt) : '가입일 정보 없음',
                  }))}
                />
                <Pager page={pageUsers} totalPages={totalPagesUsers} onPageChange={setPageUsers} />
              </div>
            )}

            {activeTab === 'categories' && (
              <div className="p-4 space-y-6">
                {loadingCategories ? (
                  <div className="text-sm text-gray-500 dark:text-gray-400">카테고리를 불러오는 중...</div>
                ) : (
                  <div className="grid lg:grid-cols-2 gap-6">
                    <CategoryManager
                      title="바이브코딩 카테고리"
                      items={appCategories}
                      form={appCategoryForm}
                      setForm={setAppCategoryForm}
                      edits={categoryEdits}
                      setEdits={setCategoryEdits}
                      iconOptions={appIconOptions}
                      colorOptions={appColorOptions}
                      onCreate={() => handleCreateCategory('app')}
                      onDelete={handleDeleteCategory}
                      onUpdate={handleUpdateCategory}
                      onSeed={() => handleSeedDefaults('app')}
                      onSeedFromData={() => handleSeedFromData('app')}
                      saving={savingCategory}
                    />
                    <CategoryManager
                      title="프롬프트 카테고리"
                      items={promptCategories}
                      form={promptCategoryForm}
                      setForm={setPromptCategoryForm}
                      edits={categoryEdits}
                      setEdits={setCategoryEdits}
                      iconOptions={promptIconOptions}
                      colorOptions={promptColorOptions}
                      onCreate={() => handleCreateCategory('prompt')}
                      onDelete={handleDeleteCategory}
                      onUpdate={handleUpdateCategory}
                      onSeed={() => handleSeedDefaults('prompt')}
                      onSeedFromData={() => handleSeedFromData('prompt')}
                      saving={savingCategory}
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">최신 댓글</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">최근 {Math.min(8, comments.length)}개</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {comments.slice(0, 8).map((comment) => (
                <div key={comment.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{comment.createdByName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{formatDate(comment.createdAt)}</div>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-200 mt-1 line-clamp-2">{comment.content}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    대상: {comment.targetType} / {comment.targetId}
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">댓글이 없습니다.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 flex items-center gap-3">
      <div className="h-12 w-12 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-200 flex items-center justify-center text-xl">
        {icon}
      </div>
      <div>
        <div className="text-sm text-gray-600 dark:text-gray-400">{label}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</div>
      </div>
    </div>
  );
}

function ListCard({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string; subtitle: string; meta: string }[];
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {items.map((item) => (
          <div key={item.id} className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{item.subtitle}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{item.meta}</div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function CategoryManager({
  title,
  items,
  form,
  setForm,
  edits,
  setEdits,
  iconOptions,
  colorOptions,
  onCreate,
  onDelete,
  onUpdate,
  onSeed,
  onSeedFromData,
  saving,
}: {
  title: string;
  items: CategoryRecord[];
  form: { value: string; label: string; color: string; icon: string };
  setForm: React.Dispatch<React.SetStateAction<{ value: string; label: string; color: string; icon: string }>>;
  edits: Record<string, { label: string; color: string; icon: string }>;
  setEdits: React.Dispatch<React.SetStateAction<Record<string, { label: string; color: string; icon: string }>>>;
  iconOptions: Record<string, React.ComponentType<{ className?: string }>>;
  colorOptions: string[];
  onCreate: () => void;
  onDelete: (category: CategoryRecord) => void;
  onUpdate: (category: CategoryRecord) => void;
  onSeed: () => void;
  onSeedFromData: () => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSeedFromData}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            등록 데이터에서 가져오기
          </button>
          <button
            type="button"
            onClick={onSeed}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            기본 카테고리 추가
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <input
          value={form.value}
          onChange={(e) => setForm((prev) => ({ ...prev, value: e.target.value }))}
          placeholder="value (예: research)"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
        />
        <input
          value={form.label}
          onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
          placeholder="label (예: 리서치)"
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
        />
        <select
          value={form.icon}
          onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
        >
          {Object.keys(iconOptions).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <select
          value={form.color}
          onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
          className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
        >
          {colorOptions.map((color) => (
            <option key={color} value={color}>
              {color}
            </option>
          ))}
        </select>
      </div>
      <button
        type="button"
        onClick={onCreate}
        disabled={saving}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        <FaPlus />
        카테고리 추가
      </button>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">등록된 카테고리가 없습니다.</div>
        ) : (
          items.map((category) => {
            const Icon = iconOptions[category.icon];
            const edit = edits[category.id] || { label: category.label, color: category.color, icon: category.icon };
            const isDirty = edit.label !== category.label || edit.color !== category.color || edit.icon !== category.icon;
            return (
              <div
                key={category.id}
                className="flex flex-col gap-3 rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`h-8 w-8 rounded-lg text-white flex items-center justify-center ${edit.color}`}>
                      {Icon ? <Icon /> : null}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{category.label}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{category.value}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(category)}
                    className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <FaTrash />
                    삭제
                  </button>
                </div>
                <div className="grid sm:grid-cols-3 gap-2">
                  <input
                    value={edit.label}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [category.id]: { ...edit, label: e.target.value } }))
                    }
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
                    placeholder="라벨"
                  />
                  <select
                    value={edit.icon}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [category.id]: { ...edit, icon: e.target.value } }))
                    }
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
                  >
                    {Object.keys(iconOptions).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                  <select
                    value={edit.color}
                    onChange={(e) =>
                      setEdits((prev) => ({ ...prev, [category.id]: { ...edit, color: e.target.value } }))
                    }
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-sm px-3 py-2"
                  >
                    {colorOptions.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => onUpdate(category)}
                    disabled={saving || !isDirty}
                    className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                  >
                    수정
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { label: string; apps: number; prompts: number; comments: number }[] }) {
  const maxValue = Math.max(1, ...data.map((d) => d.apps + d.prompts + d.comments));
  return (
    <div className="grid grid-cols-7 gap-3">
      {data.map((day) => {
        const total = day.apps + day.prompts + day.comments;
        const scale = (value: number) => `${(value / maxValue) * 100}%`;
        return (
          <div key={day.label} className="flex flex-col items-center gap-2">
            <div className="relative w-full group">
              <div className="h-32 w-full bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col-reverse overflow-hidden border border-gray-100 dark:border-gray-800">
                <div className="bg-blue-500" style={{ height: scale(day.apps) }} />
                <div className="bg-emerald-500" style={{ height: scale(day.prompts) }} />
                <div className="bg-purple-500" style={{ height: scale(day.comments) }} />
              </div>
              <div className="pointer-events-none absolute left-2 right-2 top-2 rounded-lg bg-gray-900/90 text-white text-[11px] leading-snug px-2.5 py-2 opacity-0 group-hover:opacity-100 transition shadow-lg">
                <div className="font-semibold">{day.label}</div>
                <div>앱 {day.apps} · 프롬프트 {day.prompts} · 댓글 {day.comments}</div>
                <div>합계 {total}</div>
              </div>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{total}</div>
              <div>{day.label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-3 h-3 rounded ${color}`}></span>
      <span>{label}</span>
    </div>
  );
}

function CreatorActivityChart({
  data,
}: {
  data: { name: string; apps: number; prompts: number; comments: number; userId: string }[];
}) {
  const maxTotal = Math.max(1, ...data.map((d) => d.apps + d.prompts + d.comments));
  const width = (value: number) => `${(value / maxTotal) * 100}%`;

  return (
    <div className="space-y-3">
      {data.map((creator) => {
        const total = creator.apps + creator.prompts + creator.comments;
        return (
          <div key={creator.userId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <div className="font-semibold text-gray-900 dark:text-gray-100">{creator.name}</div>
              <div className="text-gray-600 dark:text-gray-400">총 {total}</div>
            </div>
            <div className="w-full h-8 bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 flex">
              <div className="bg-blue-500 h-full" style={{ width: width(creator.apps) }} />
              <div className="bg-emerald-500 h-full" style={{ width: width(creator.prompts) }} />
              <div className="bg-purple-500 h-full" style={{ width: width(creator.comments) }} />
            </div>
          </div>
        );
      })}
      {data.length === 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">작성자 데이터가 없습니다.</div>
      )}
    </div>
  );
}

function Pager({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(totalPages, page + 1));

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-800 text-sm text-gray-600 dark:text-gray-300">
      <div>
        페이지 {page} / {totalPages}
      </div>
      <div className="flex gap-2">
        <button
          onClick={prev}
          disabled={page === 1}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          이전
        </button>
        <button
          onClick={next}
          disabled={page === totalPages}
          className="px-3 py-1 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          다음
        </button>
      </div>
    </div>
  );
}
