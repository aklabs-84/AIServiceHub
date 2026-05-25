import { getServerClient } from '@/lib/database/server';
import { db } from '@/lib/database';
import CourseFormPage from '../../CourseFormClient';
import { notFound } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditClassPage({ params }: Props) {
  const { id } = await params;
  const client = await getServerClient();
  const course = await db.education.getCourseById(client, id).catch(() => null);
  if (!course) notFound();

  return <CourseFormPage mode="edit" initialData={course} />;
}
