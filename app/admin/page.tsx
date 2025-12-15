'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllApps, getAllPrompts, getAllComments, getAllUsers, UserProfile } from '@/lib/db';
import { AIApp } from '@/types/app';
import { Prompt } from '@/types/prompt';
import { Comment } from '@/types/comment';
import { FaUsers, FaRobot, FaRegCommentDots, FaListUl, FaLock } from 'react-icons/fa';

const ADMIN_EMAIL = 'mosebb@gmail.com';

interface CreatorStat {
  userId: string;
  name: string;
  apps: number;
  prompts: number;
  comments: number;
}

type TabKey = 'creators' | 'apps' | 'prompts' | 'users';

export default function AdminPage() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
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

  const pageSize = 10;

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return;
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
        alert('관리자 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoadingData(false);
      }
    };
    fetchAll();
  }, [user]);

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
    const today = new Date();
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
  }, [apps, prompts, comments]);

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

  if (user.email !== ADMIN_EMAIL) {
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
        <button
          onClick={signOut}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          로그아웃
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<FaUsers />} label="활성 작성자" value={creatorStats.length} />
        <StatCard icon={<FaRobot />} label="앱" value={apps.length} />
        <StatCard icon={<FaListUl />} label="프롬프트" value={prompts.length} />
        <StatCard icon={<FaRegCommentDots />} label="댓글" value={comments.length} />
      </div>

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
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabKey)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    activeTab === tab.key
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
            <div className="h-32 w-full bg-gray-50 dark:bg-gray-800 rounded-lg flex flex-col-reverse overflow-hidden border border-gray-100 dark:border-gray-800">
              <div className="bg-blue-500" style={{ height: scale(day.apps) }} />
              <div className="bg-emerald-500" style={{ height: scale(day.prompts) }} />
              <div className="bg-purple-500" style={{ height: scale(day.comments) }} />
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
