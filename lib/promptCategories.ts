import { PromptCategory } from '@/types/prompt';
import { promptCategoryDefaults, promptIconOptions } from '@/lib/categoryOptions';

export interface PromptCategoryInfo {
  value: PromptCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export const promptCategories: PromptCategoryInfo[] = promptCategoryDefaults.map((item) => ({
  value: item.value,
  label: item.label,
  icon: promptIconOptions[item.icon] || promptIconOptions.smile,
  color: item.color,
}));

export function getPromptCategoryInfo(
  category: PromptCategory,
  list: PromptCategoryInfo[] = promptCategories
): PromptCategoryInfo {
  return list.find(c => c.value === category) || list[0] || promptCategories[0];
}
