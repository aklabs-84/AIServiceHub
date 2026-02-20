import type { PromptCategory } from '@/types/database';
import { promptCategoryDefaults, promptIconOptions } from '@/lib/categoryOptions';

export interface PromptCategoryInfo {
  value: PromptCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const promptCategories: PromptCategoryInfo[] = promptCategoryDefaults.map((item) => {
  const iconKey = item.icon as keyof typeof promptIconOptions;
  return {
    value: item.value,
    label: item.label,
    icon: promptIconOptions[iconKey] || promptIconOptions.smile,
    color: item.color,
  };
});

export function getPromptCategoryInfo(
  category: PromptCategory,
  list: PromptCategoryInfo[] = promptCategories
): PromptCategoryInfo {
  return list.find(c => c.value === category) || list[0] || promptCategories[0];
}
