import { getServerClient } from '@/lib/database/server';
import { getAdminClient, db } from '@/lib/database';
import CourseFormPage from '../../CourseFormClient';
import { notFound, redirect } from 'next/navigation';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'mosebb@gmail.com';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: Props) {
  const { id } = await params;

  // 관리자 체크
  const serverClient = await getServerClient();
  const { data: { user } } = await serverClient.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect('/classes');

  // admin client로 조회 (RLS 우회 — 비공개 클래스도 수정 가능)
  const admin = getAdminClient();
  const course = await db.education.getCourseById(admin, id).catch(() => null);
  if (!course) notFound();

  return <CourseFormPage mode="edit" initialData={course} />;
}
