import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { AIApp, CreateAppInput, UpdateAppInput, AppCategory } from '@/types/app';
import { Prompt, CreatePromptInput, UpdatePromptInput, PromptCategory } from '@/types/prompt';
import { Comment, CommentTargetType } from '@/types/comment';

const APPS_COLLECTION = 'apps';
const PROMPTS_COLLECTION = 'prompts';
const COMMENTS_COLLECTION = 'comments';

// Firestore 데이터를 AIApp 타입으로 변환
function docToApp(id: string, data: any): AIApp {
  const likes = data.likes || [];
  return {
    id,
    name: data.name,
    description: data.description,
    appUrl: data.appUrl,
    snsUrls: data.snsUrls || [],
    category: data.category,
    thumbnailUrl: data.thumbnailUrl,
    createdBy: data.createdBy,
    createdByName: data.createdByName || '익명',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    likes,
    likeCount: likes.length,
  };
}

// Firestore 데이터를 Prompt 타입으로 변환
function docToPrompt(id: string, data: any): Prompt {
  return {
    id,
    name: data.name,
    description: data.description,
    promptContent: data.promptContent,
    snsUrls: data.snsUrls || [],
    category: data.category,
    thumbnailUrl: data.thumbnailUrl,
    createdBy: data.createdBy,
    createdByName: data.createdByName || '익명',
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

// Firestore 데이터를 Comment 타입으로 변환
function docToComment(id: string, data: any): Comment {
  return {
    id,
    targetId: data.targetId,
    targetType: data.targetType,
    content: data.content,
    createdBy: data.createdBy,
    createdByName: data.createdByName || '익명',
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}

// 모든 앱 가져오기
export async function getAllApps(): Promise<AIApp[]> {
  const appsCol = collection(db, APPS_COLLECTION);
  const q = query(appsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToApp(doc.id, doc.data()));
}

// 카테고리별 앱 가져오기
export async function getAppsByCategory(category: AppCategory): Promise<AIApp[]> {
  const appsCol = collection(db, APPS_COLLECTION);
  const q = query(
    appsCol,
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToApp(doc.id, doc.data()));
}

// 특정 앱 가져오기
export async function getAppById(id: string): Promise<AIApp | null> {
  const docRef = doc(db, APPS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToApp(docSnap.id, docSnap.data());
}

// 프롬프트 가져오기
export async function getPromptById(id: string): Promise<Prompt | null> {
  const docRef = doc(db, PROMPTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return docToPrompt(docSnap.id, docSnap.data());
}

// 사용자가 만든 앱 가져오기
export async function getAppsByUser(userId: string): Promise<AIApp[]> {
  const appsCol = collection(db, APPS_COLLECTION);
  const q = query(
    appsCol,
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToApp(doc.id, doc.data()));
}

// 프롬프트 가져오기 - 전체
export async function getAllPrompts(): Promise<Prompt[]> {
  const promptsCol = collection(db, PROMPTS_COLLECTION);
  const q = query(promptsCol, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToPrompt(doc.id, doc.data()));
}

// 프롬프트 가져오기 - 카테고리별
export async function getPromptsByCategory(category: PromptCategory): Promise<Prompt[]> {
  const promptsCol = collection(db, PROMPTS_COLLECTION);
  const q = query(
    promptsCol,
    where('category', '==', category),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToPrompt(doc.id, doc.data()));
}

// 사용자가 만든 프롬프트 가져오기
export async function getPromptsByUser(userId: string): Promise<Prompt[]> {
  const promptsCol = collection(db, PROMPTS_COLLECTION);
  const q = query(
    promptsCol,
    where('createdBy', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToPrompt(doc.id, doc.data()));
}

// 앱 생성
export async function createApp(input: CreateAppInput, userId: string): Promise<string> {
  const appsCol = collection(db, APPS_COLLECTION);
  const payload: Record<string, any> = {
    ...input,
    createdBy: userId,
    snsUrls: input.snsUrls || [],
    likes: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Firestore는 undefined 값을 허용하지 않으므로 빈 썸네일은 필드 자체를 제거
  if (payload.thumbnailUrl === undefined) {
    delete payload.thumbnailUrl;
  }

  const docRef = await addDoc(appsCol, payload);

  return docRef.id;
}

// 앱 수정
export async function updateApp(input: UpdateAppInput): Promise<void> {
  const { id, ...data } = input;
  const docRef = doc(db, APPS_COLLECTION, id);

  const payload: Record<string, any> = {
    ...data,
    snsUrls: data.snsUrls || [],
    updatedAt: serverTimestamp(),
  };

  // undefined 필드는 제거
  if (payload.thumbnailUrl === undefined) {
    delete payload.thumbnailUrl;
  }

  await updateDoc(docRef, payload);
}

// 프롬프트 생성
export async function createPrompt(input: CreatePromptInput, userId: string): Promise<string> {
  const promptsCol = collection(db, PROMPTS_COLLECTION);
  const payload: Record<string, any> = {
    ...input,
    snsUrls: input.snsUrls || [],
    createdBy: userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (payload.thumbnailUrl === undefined) {
    delete payload.thumbnailUrl;
  }

  const docRef = await addDoc(promptsCol, payload);
  return docRef.id;
}

// 프롬프트 수정
export async function updatePrompt(input: UpdatePromptInput): Promise<void> {
  const { id, ...data } = input;
  const docRef = doc(db, PROMPTS_COLLECTION, id);

  const payload: Record<string, any> = {
    ...data,
    updatedAt: serverTimestamp(),
  };

  if (payload.thumbnailUrl === undefined) {
    delete payload.thumbnailUrl;
  }

  await updateDoc(docRef, payload);
}

// 프롬프트 삭제
export async function deletePrompt(id: string): Promise<void> {
  const docRef = doc(db, PROMPTS_COLLECTION, id);
  await deleteDoc(docRef);
}

// 앱 삭제
export async function deleteApp(id: string): Promise<void> {
  const docRef = doc(db, APPS_COLLECTION, id);
  await deleteDoc(docRef);
}

// 좋아요 추가
export async function likeApp(appId: string, userId: string): Promise<void> {
  const docRef = doc(db, APPS_COLLECTION, appId);
  await updateDoc(docRef, {
    likes: arrayUnion(userId)
  });
}

// 좋아요 취소
export async function unlikeApp(appId: string, userId: string): Promise<void> {
  const docRef = doc(db, APPS_COLLECTION, appId);
  await updateDoc(docRef, {
    likes: arrayRemove(userId)
  });
}

// 사용자가 좋아요한 앱 가져오기
export async function getLikedAppsByUser(userId: string): Promise<AIApp[]> {
  const appsCol = collection(db, APPS_COLLECTION);
  const q = query(
    appsCol,
    where('likes', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => docToApp(doc.id, doc.data()));
}

// 댓글 추가
export async function addComment(targetId: string, targetType: CommentTargetType, content: string, userId: string, userName: string): Promise<string> {
  const commentsCol = collection(db, COMMENTS_COLLECTION);
  const payload = {
    targetId,
    targetType,
    content,
    createdBy: userId,
    createdByName: userName || '익명',
    createdAt: serverTimestamp(),
  };
  const docRef = await addDoc(commentsCol, payload);
  return docRef.id;
}

// 댓글 목록 가져오기
export async function getComments(targetId: string, targetType: CommentTargetType): Promise<Comment[]> {
  const commentsCol = collection(db, COMMENTS_COLLECTION);
  const q = query(
    commentsCol,
    where('targetId', '==', targetId),
    where('targetType', '==', targetType),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => docToComment(doc.id, doc.data()));
}

// 댓글 수정
export async function updateComment(commentId: string, content: string): Promise<void> {
  const docRef = doc(db, COMMENTS_COLLECTION, commentId);
  await updateDoc(docRef, {
    content,
    // createdAt은 수정하지 않음
    updatedAt: serverTimestamp(),
  });
}

// 댓글 삭제
export async function deleteComment(commentId: string): Promise<void> {
  const docRef = doc(db, COMMENTS_COLLECTION, commentId);
  await deleteDoc(docRef);
}
