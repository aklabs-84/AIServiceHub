import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import ClassroomClient from './ClassroomClient';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ClassroomPage({ params }: Props) {
  const { id } = await params;
  const client = await getServerClient();
  const course = await db.education.getCourseById(client, id).catch(() => null);
  if (!course) notFound();

  return <ClassroomClient course={course} />;
}
