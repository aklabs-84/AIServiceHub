import { getServerClient } from '@/lib/database/server';
import { getAdminClient, db } from '@/lib/database';
import ClassDetailClient from './ClassDetailClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const admin = getAdminClient();
  const course = await db.education.getCourseById(admin, id).catch(() => null);
  if (!course) return { title: '클래스 | AI LABS' };
  return {
    title: `${course.title} | AI LABS 클래스`,
    description: course.description || '클래스 상세 정보',
  };
}

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params;

  // 현재 유저 확인 (관리자 여부)
  const serverClient = await getServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  const isAdmin = user?.email === ADMIN_EMAIL;

  // 관리자는 admin client (RLS 우회, 비공개 포함)
  // 일반 사용자는 admin client로 조회 후 isPublished 코드 레벨 체크
  const admin = getAdminClient();
  const course = await db.education.getCourseById(admin, id).catch(() => null);

  if (!course) notFound();
  if (!isAdmin && !course.isPublished) notFound();

  return <ClassDetailClient course={course} />;
}
