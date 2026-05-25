import { getAdminClient, db } from '@/lib/database';
import ClassroomClient from './ClassroomClient';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClassroomPage({ params }: Props) {
  const { id } = await params;
  // admin client로 조회 — RLS와 무관하게 코스 정보를 가져옴
  // (접근 권한은 ClassroomClient에서 enrollment/entry_code로 체크)
  const admin = getAdminClient();
  const course = await db.education.getCourseById(admin, id).catch(() => null);
  if (!course) notFound();

  return <ClassroomClient course={course} />;
}
