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

const APPS_COLLECTION = 'apps';

// Firestore 데이터를 AIApp 타입으로 변환
function docToApp(id: string, data: any): AIApp {
  const likes = data.likes || [];
  return {
    id,
    name: data.name,
    description: data.description,
    appUrl: data.appUrl,
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

// 앱 생성
export async function createApp(input: CreateAppInput, userId: string): Promise<string> {
  const appsCol = collection(db, APPS_COLLECTION);
  const payload: Record<string, any> = {
    ...input,
    createdBy: userId,
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
    updatedAt: serverTimestamp(),
  };

  // undefined 필드는 제거
  if (payload.thumbnailUrl === undefined) {
    delete payload.thumbnailUrl;
  }

  await updateDoc(docRef, payload);
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
