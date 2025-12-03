import { PromptCategory } from '@/types/prompt';
import { FaSmile, FaBriefcase, FaMagic, FaHeart, FaGraduationCap } from 'react-icons/fa';

export interface PromptCategoryInfo {
  value: PromptCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const promptCategories: PromptCategoryInfo[] = [
  {
    value: 'daily',
    label: '일상',
    icon: FaSmile,
    color: 'bg-emerald-500',
  },
  {
    value: 'work',
    label: '업무',
    icon: FaBriefcase,
    color: 'bg-blue-500',
  },
  {
    value: 'fun',
    label: '재미',
    icon: FaMagic,
    color: 'bg-purple-500',
  },
  {
    value: 'relationship',
    label: '관계',
    icon: FaHeart,
    color: 'bg-pink-500',
  },
  {
    value: 'education',
    label: '교육',
    icon: FaGraduationCap,
    color: 'bg-orange-500',
  },
];

export function getPromptCategoryInfo(category: PromptCategory): PromptCategoryInfo {
  return promptCategories.find(c => c.value === category) || promptCategories[0];
}
