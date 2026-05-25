import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import ClassesClient from './ClassesClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '클래스 | AI LABS',
  description: 'AI LABS의 오프라인·온라인 클래스에 참여하세요.',
};

export default async function ClassesPage() {
  const client = await getServerClient();
  const courses = await db.education.getPublishedCourses(client).catch(() => []);
  return <ClassesClient initialCourses={courses} />;
}
