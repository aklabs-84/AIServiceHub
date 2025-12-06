import { AppCategory } from '@/types/app';
import {
  FaRobot,
  FaPencilAlt,
  FaChartBar,
  FaImage,
  FaCode,
  FaLanguage,
  FaGraduationCap,
  FaGamepad,
  FaBriefcase,
  FaPuzzlePiece
} from 'react-icons/fa';

export interface CategoryInfo {
  value: AppCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const categories: CategoryInfo[] = [
  {
    value: 'chatbot',
    label: '챗봇',
    icon: FaRobot,
    color: 'bg-blue-500',
  },
  {
    value: 'content-generation',
    label: '콘텐츠 생성',
    icon: FaPencilAlt,
    color: 'bg-purple-500',
  },
  {
    value: 'data-analysis',
    label: '데이터 분석',
    icon: FaChartBar,
    color: 'bg-green-500',
  },
  {
    value: 'image-generation',
    label: '이미지 생성',
    icon: FaImage,
    color: 'bg-pink-500',
  },
  {
    value: 'code-assistant',
    label: '코드 어시스턴트',
    icon: FaCode,
    color: 'bg-yellow-500',
  },
  {
    value: 'translation',
    label: '번역',
    icon: FaLanguage,
    color: 'bg-indigo-500',
  },
  {
    value: 'education',
    label: '교육',
    icon: FaGraduationCap,
    color: 'bg-red-500',
  },
  {
    value: 'game',
    label: '게임',
    icon: FaGamepad,
    color: 'bg-orange-500',
  },
  {
    value: 'productivity',
    label: '생산성',
    icon: FaBriefcase,
    color: 'bg-teal-500',
  },
  {
    value: 'other',
    label: '기타',
    icon: FaPuzzlePiece,
    color: 'bg-gray-500',
  },
];

export function getCategoryInfo(category: AppCategory): CategoryInfo {
  return categories.find(c => c.value === category) || categories[categories.length - 1];
}
