import { AppCategory } from '@/types/app';
import { appCategoryDefaults, appIconOptions } from '@/lib/categoryOptions';

export interface CategoryInfo {
  value: AppCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const categories: CategoryInfo[] = appCategoryDefaults.map((item) => {
  const iconKey = item.icon as keyof typeof appIconOptions;
  return {
    value: item.value,
    label: item.label,
    icon: appIconOptions[iconKey] || appIconOptions.puzzle,
    color: item.color,
  };
});

export function getCategoryInfo(category: AppCategory, list: CategoryInfo[] = categories): CategoryInfo {
  return list.find(c => c.value === category) || list[list.length - 1] || categories[categories.length - 1];
}
