import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Course, CourseRow, Enrollment, EnrollmentRow,
  CreateCourseInput, UpdateCourseInput, EnrollmentStatus,
} from '@/types/database';

// ────────────────────────────────────────────────
// Mapper helpers
// ────────────────────────────────────────────────

function mapCourseFromDB(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    content: row.content ?? '',
    scheduleAt: row.schedule_at ? new Date(row.schedule_at) : null,
    durationMinutes: row.duration_minutes,
    locationType: row.location_type,
    locationDetail: row.location_detail ?? '',
    capacity: row.capacity,
    price: row.price,
    isPaid: row.is_paid,
    isPublic: row.is_public,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    tags: row.tags ?? [],
    classCode: row.class_code ?? null,
    resourceUrl: row.resource_url ?? '',
    resourceUrls: row.resource_urls ?? [],
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    enrollmentCount: row.enrollment_count ?? 0,
  };
}

function mapEnrollmentFromDB(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    courseId: row.course_id,
    userId: row.user_id,
    status: row.status,
    entryCode: row.entry_code ?? null,
    purchaseOrderId: row.purchase_order_id ?? null,
    notes: row.notes ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    userName: row.profiles?.display_name ?? undefined,
    userEmail: row.profiles?.email ?? undefined,
    courseTitle: row.education_courses?.title ?? undefined,
    coursePrice: row.education_courses?.price ?? undefined,
    courseIsPaid: row.education_courses?.is_paid ?? undefined,
  };
}

// ────────────────────────────────────────────────
// Courses
// ────────────────────────────────────────────────

async function getPublicCourses(client: SupabaseClient): Promise<Course[]> {
  const { data, error } = await client
    .from('education_courses')
    .select('*')
    .eq('is_public', true)
    .order('schedule_at', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data as CourseRow[]).map(mapCourseFromDB);
}

async function getAllCourses(client: SupabaseClient): Promise<Course[]> {
  const { data, error } = await client
    .from('education_courses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CourseRow[]).map(mapCourseFromDB);
}

async function getCourseById(
  client: SupabaseClient,
  id: string
): Promise<Course | null> {
  const { data, error } = await client
    .from('education_courses')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCourseFromDB(data as CourseRow) : null;
}

async function createCourse(
  client: SupabaseClient,
  input: CreateCourseInput,
  userId: string,
  userName: string
): Promise<Course> {
  const classCode = generateCode(8);
  const { data, error } = await client
    .from('education_courses')
    .insert({
      title: input.title,
      description: input.description ?? '',
      content: input.content ?? '',
      schedule_at: input.scheduleAt ?? null,
      duration_minutes: input.durationMinutes ?? 60,
      location_type: input.locationType ?? 'online',
      location_detail: input.locationDetail ?? '',
      capacity: input.capacity ?? 0,
      price: input.price ?? 0,
      is_paid: input.isPaid ?? false,
      is_public: input.isPublic ?? true,
      thumbnail_url: input.thumbnailUrl ?? null,
      tags: input.tags ?? [],
      class_code: classCode,
      resource_url: input.resourceUrl ?? '',
      resource_urls: input.resourceUrls ?? [],
      created_by: userId,
      created_by_name: userName,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCourseFromDB(data as CourseRow);
}

async function updateCourse(
  client: SupabaseClient,
  input: UpdateCourseInput
): Promise<Course> {
  const { id, ...rest } = input;
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.title !== undefined) updateData.title = rest.title;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.content !== undefined) updateData.content = rest.content;
  if (rest.scheduleAt !== undefined) updateData.schedule_at = rest.scheduleAt;
  if (rest.durationMinutes !== undefined) updateData.duration_minutes = rest.durationMinutes;
  if (rest.locationType !== undefined) updateData.location_type = rest.locationType;
  if (rest.locationDetail !== undefined) updateData.location_detail = rest.locationDetail;
  if (rest.capacity !== undefined) updateData.capacity = rest.capacity;
  if (rest.price !== undefined) updateData.price = rest.price;
  if (rest.isPaid !== undefined) updateData.is_paid = rest.isPaid;
  if (rest.isPublic !== undefined) updateData.is_public = rest.isPublic;
  if (rest.thumbnailUrl !== undefined) updateData.thumbnail_url = rest.thumbnailUrl;
  if (rest.tags !== undefined) updateData.tags = rest.tags;
  if (rest.resourceUrl !== undefined) updateData.resource_url = rest.resourceUrl;
  if (rest.resourceUrls !== undefined) updateData.resource_urls = rest.resourceUrls;

  const { data, error } = await client
    .from('education_courses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCourseFromDB(data as CourseRow);
}

async function deleteCourse(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client
    .from('education_courses')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ────────────────────────────────────────────────
// Enrollments
// ────────────────────────────────────────────────

async function getEnrollmentsByCourse(
  client: SupabaseClient,
  courseId: string
): Promise<Enrollment[]> {
  const { data, error } = await client
    .from('education_enrollments')
    .select('*, profiles(display_name, email)')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EnrollmentRow[]).map(mapEnrollmentFromDB);
}

async function getMyEnrollments(
  client: SupabaseClient,
  userId: string
): Promise<Enrollment[]> {
  const { data, error } = await client
    .from('education_enrollments')
    .select('*, education_courses(title, price, is_paid)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as EnrollmentRow[]).map(mapEnrollmentFromDB);
}

async function getEnrollmentByUser(
  client: SupabaseClient,
  courseId: string,
  userId: string
): Promise<Enrollment | null> {
  const { data, error } = await client
    .from('education_enrollments')
    .select('*')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEnrollmentFromDB(data as EnrollmentRow) : null;
}

async function getEnrollmentByCode(
  client: SupabaseClient,
  entryCode: string
): Promise<Enrollment | null> {
  const { data, error } = await client
    .from('education_enrollments')
    .select('*, education_courses(title, price, is_paid)')
    .eq('entry_code', entryCode)
    .maybeSingle();
  if (error) throw error;
  return data ? mapEnrollmentFromDB(data as EnrollmentRow) : null;
}

async function createEnrollment(
  client: SupabaseClient,
  courseId: string,
  userId: string,
  purchaseOrderId?: string
): Promise<Enrollment> {
  const { data, error } = await client
    .from('education_enrollments')
    .insert({
      course_id: courseId,
      user_id: userId,
      status: 'pending',
      purchase_order_id: purchaseOrderId ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapEnrollmentFromDB(data as EnrollmentRow);
}

async function confirmEnrollment(
  client: SupabaseClient,
  enrollmentId: string
): Promise<Enrollment> {
  const entryCode = generateCode(10);
  const { data, error } = await client
    .from('education_enrollments')
    .update({
      status: 'confirmed' as EnrollmentStatus,
      entry_code: entryCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('*, profiles(display_name, email), education_courses(title, price, is_paid)')
    .single();
  if (error) throw error;
  return mapEnrollmentFromDB(data as EnrollmentRow);
}

async function updateEnrollmentStatus(
  client: SupabaseClient,
  enrollmentId: string,
  status: EnrollmentStatus,
  notes?: string
): Promise<Enrollment> {
  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (notes !== undefined) updateData.notes = notes;

  const { data, error } = await client
    .from('education_enrollments')
    .update(updateData)
    .eq('id', enrollmentId)
    .select('*, profiles(display_name, email), education_courses(title, price, is_paid)')
    .single();
  if (error) throw error;
  return mapEnrollmentFromDB(data as EnrollmentRow);
}

async function getPendingEnrollments(
  client: SupabaseClient
): Promise<Enrollment[]> {
  const { data, error } = await client
    .from('education_enrollments')
    .select('*, profiles(display_name, email), education_courses(title, price, is_paid)')
    .in('status', ['pending', 'waitlist'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data as EnrollmentRow[]).map(mapEnrollmentFromDB);
}

async function getEnrollmentCount(
  client: SupabaseClient,
  courseId: string
): Promise<number> {
  const { count, error } = await client
    .from('education_enrollments')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .in('status', ['pending', 'confirmed']);
  if (error) throw error;
  return count ?? 0;
}

// ────────────────────────────────────────────────
// Utility
// ────────────────────────────────────────────────

function generateCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리기 쉬운 0/O/1/I 제외
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const education = {
  // Courses
  getPublicCourses,
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  // Enrollments
  getEnrollmentsByCourse,
  getMyEnrollments,
  getEnrollmentByUser,
  getEnrollmentByCode,
  createEnrollment,
  confirmEnrollment,
  updateEnrollmentStatus,
  getPendingEnrollments,
  getEnrollmentCount,
};
