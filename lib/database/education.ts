import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  Course, CourseRow, Enrollment, EnrollmentRow,
  CreateCourseInput, UpdateCourseInput, EnrollmentStatus,
} from '@/types/database';

// ────────────────────────────────────────────────
// Mappers
// ────────────────────────────────────────────────

function mapCourseFromDB(row: CourseRow): Course {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    thumbnailUrl: row.thumbnail_url ?? undefined,
    thumbnailPositionX: row.thumbnail_pos?.x ?? 50,
    thumbnailPositionY: row.thumbnail_pos?.y ?? 50,
    courseType: row.course_type,
    startAt: row.start_at ? new Date(row.start_at) : null,
    endAt: row.end_at ? new Date(row.end_at) : null,
    location: row.location ?? '',
    materials: row.materials ?? [],
    materialUrl: row.material_url ?? '',
    tags: row.tags ?? [],
    maxParticipants: row.max_participants ?? null,
    price: row.price,
    isPaid: row.is_paid,
    isPublished: row.is_published,
    likeCount: row.like_count,
    classEntryCode: row.class_entry_code ?? null,
    createdBy: row.created_by,
    createdByName: row.created_by_name ?? '',
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapEnrollmentFromDB(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    courseId: row.course_id,
    userId: row.user_id,
    userName: row.user_name ?? null,
    userEmail: row.user_email ?? null,
    status: row.status,
    entryCode: row.entry_code ?? null,
    note: row.note ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    courseTitle: row.education_courses?.title ?? undefined,
    coursePrice: row.education_courses?.price ?? undefined,
    courseIsPaid: row.education_courses?.is_paid ?? undefined,
  };
}

// ────────────────────────────────────────────────
// Courses
// ────────────────────────────────────────────────

async function getPublishedCourses(client: SupabaseClient): Promise<Course[]> {
  const { data, error } = await client
    .from('education_courses')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });
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
  const { data, error } = await client
    .from('education_courses')
    .insert({
      title: input.title,
      description: input.description ?? '',
      thumbnail_url: input.thumbnailUrl ?? null,
      thumbnail_pos: (input.thumbnailPositionX !== undefined || input.thumbnailPositionY !== undefined)
        ? { x: input.thumbnailPositionX ?? 50, y: input.thumbnailPositionY ?? 50 }
        : null,
      course_type: input.courseType ?? 'online',
      start_at: input.startAt,
      end_at: input.endAt,
      location: input.location ?? '',
      materials: input.materials ?? [],
      material_url: input.materialUrl ?? '',
      tags: input.tags ?? [],
      max_participants: input.maxParticipants ?? null,
      price: input.price ?? 0,
      is_paid: input.isPaid ?? false,
      is_published: input.isPublished ?? false,
      class_entry_code: generateCode(8), // 클래스 단일 입장코드 자동 생성
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
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (rest.title !== undefined) patch.title = rest.title;
  if (rest.description !== undefined) patch.description = rest.description;
  if (rest.thumbnailUrl !== undefined) patch.thumbnail_url = rest.thumbnailUrl;
  if (rest.thumbnailPositionX !== undefined || rest.thumbnailPositionY !== undefined) {
    patch.thumbnail_pos = { x: rest.thumbnailPositionX ?? 50, y: rest.thumbnailPositionY ?? 50 };
  }
  if (rest.courseType !== undefined) patch.course_type = rest.courseType;
  if (rest.startAt !== undefined) patch.start_at = rest.startAt;
  if (rest.endAt !== undefined) patch.end_at = rest.endAt;
  if (rest.location !== undefined) patch.location = rest.location;
  if (rest.materials !== undefined) patch.materials = rest.materials;
  if (rest.materialUrl !== undefined) patch.material_url = rest.materialUrl;
  if (rest.tags !== undefined) patch.tags = rest.tags;
  if (rest.maxParticipants !== undefined) patch.max_participants = rest.maxParticipants;
  if (rest.price !== undefined) patch.price = rest.price;
  if (rest.isPaid !== undefined) patch.is_paid = rest.isPaid;
  if (rest.isPublished !== undefined) patch.is_published = rest.isPublished;
  if ((rest as Record<string, unknown>).classEntryCode !== undefined) {
    patch.class_entry_code = (rest as Record<string, unknown>).classEntryCode;
  }

  const { data, error } = await client
    .from('education_courses')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapCourseFromDB(data as CourseRow);
}

async function getCourseByClassEntryCode(
  client: SupabaseClient,
  code: string
): Promise<Course | null> {
  const { data, error } = await client
    .from('education_courses')
    .select('*')
    .eq('class_entry_code', code)
    .maybeSingle();
  if (error) throw error;
  return data ? mapCourseFromDB(data as CourseRow) : null;
}

async function setClassEntryCode(
  client: SupabaseClient,
  courseId: string
): Promise<string> {
  const code = generateCode(8);
  const { error } = await client
    .from('education_courses')
    .update({ class_entry_code: code, updated_at: new Date().toISOString() })
    .eq('id', courseId);
  if (error) throw error;
  return code;
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
    .select('*')
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
    .select('*, education_courses(title, price, is_paid)')
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
  params: {
    courseId: string;
    userId: string;
    userName: string;
    userEmail: string;
  }
): Promise<Enrollment> {
  const { data, error } = await client
    .from('education_enrollments')
    .insert({
      course_id: params.courseId,
      user_id: params.userId,
      user_name: params.userName,
      user_email: params.userEmail,
      status: 'pending',
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
  const entryCode = generateCode(8);
  const { data, error } = await client
    .from('education_enrollments')
    .update({
      status: 'confirmed' as EnrollmentStatus,
      entry_code: entryCode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', enrollmentId)
    .select('*, education_courses(title, price, is_paid)')
    .single();
  if (error) throw error;
  return mapEnrollmentFromDB(data as EnrollmentRow);
}

async function updateEnrollmentStatus(
  client: SupabaseClient,
  enrollmentId: string,
  status: EnrollmentStatus,
  note?: string
): Promise<Enrollment> {
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (note !== undefined) patch.note = note;

  const { data, error } = await client
    .from('education_enrollments')
    .update(patch)
    .eq('id', enrollmentId)
    .select('*, education_courses(title, price, is_paid)')
    .single();
  if (error) throw error;
  return mapEnrollmentFromDB(data as EnrollmentRow);
}

async function getPendingEnrollments(
  client: SupabaseClient
): Promise<Enrollment[]> {
  const { data, error } = await client
    .from('education_enrollments')
    .select('*, education_courses(title, price, is_paid)')
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
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 헷갈리기 쉬운 O/I 제외
  const digits  = '23456789';                  // 헷갈리기 쉬운 0/1 제외
  const all     = letters + digits;

  const result: string[] = [];
  // 최소 2글자 + 2숫자 보장
  result.push(letters[Math.floor(Math.random() * letters.length)]);
  result.push(letters[Math.floor(Math.random() * letters.length)]);
  result.push(digits[Math.floor(Math.random() * digits.length)]);
  result.push(digits[Math.floor(Math.random() * digits.length)]);
  // 나머지 채우기
  for (let i = 4; i < length; i++) {
    result.push(all[Math.floor(Math.random() * all.length)]);
  }
  // Fisher-Yates 셔플로 순서 섞기
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join('');
}

export const education = {
  getPublishedCourses,
  getAllCourses,
  getCourseById,
  getCourseByClassEntryCode,
  setClassEntryCode,
  createCourse,
  updateCourse,
  deleteCourse,
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
