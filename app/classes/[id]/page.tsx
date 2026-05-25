import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import ClassDetailClient from './ClassDetailClient';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const client = await getServerClient();
  const course = await db.education.getCourseById(client, id).catch(() => null);
  if (!course) return { title: '클래스 | AI LABS' };
  return {
    title: `${course.title} | AI LABS 클래스`,
    description: course.description || '클래스 상세 정보',
  };
}

export default async function ClassDetailPage({ params }: Props) {
  const { id } = await params;
  const client = await getServerClient();
  const course = await db.education.getCourseById(client, id).catch(() => null);
  if (!course || !course.isPublic) notFound();

  return <ClassDetailClient course={course} />;
}
