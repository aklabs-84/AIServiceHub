import { useEffect, useMemo, useState } from 'react';
import { getCategoriesByType } from '@/lib/db';
import { CategoryRecord } from '@/types/category';
import { CategoryInfo } from '@/lib/categories';
import { PromptCategoryInfo } from '@/lib/promptCategories';
import {
  appCategoryDefaults,
  appIconOptions,
  promptCategoryDefaults,
  promptIconOptions,
} from '@/lib/categoryOptions';

const buildAppCategoryInfo = (category: CategoryRecord): CategoryInfo => ({
  value: category.value,
  label: category.label,
  color: category.color,
  icon: appIconOptions[category.icon] || appIconOptions.puzzle,
});

const buildPromptCategoryInfo = (category: CategoryRecord): PromptCategoryInfo => ({
  value: category.value,
  label: category.label,
  color: category.color,
  icon: promptIconOptions[category.icon] || promptIconOptions.smile,
});

const defaultAppCategories = appCategoryDefaults.map((item) => buildAppCategoryInfo({
  id: item.value,
  type: 'app',
  value: item.value,
  label: item.label,
  color: item.color,
  icon: item.icon,
}));

const defaultPromptCategories = promptCategoryDefaults.map((item) => buildPromptCategoryInfo({
  id: item.value,
  type: 'prompt',
  value: item.value,
  label: item.label,
  color: item.color,
  icon: item.icon,
}));

export function useAppCategories() {
  const [categories, setCategories] = useState<CategoryInfo[]>(defaultAppCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getCategoriesByType('app');
        if (!active) return;
        if (data.length === 0) {
          setCategories(defaultAppCategories);
        } else {
          setCategories(data.map(buildAppCategoryInfo));
        }
      } catch (error) {
        console.error('Failed to load app categories:', error);
        setCategories(defaultAppCategories);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => ({ categories, loading }), [categories, loading]);
}

export function usePromptCategories() {
  const [categories, setCategories] = useState<PromptCategoryInfo[]>(defaultPromptCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await getCategoriesByType('prompt');
        if (!active) return;
        if (data.length === 0) {
          setCategories(defaultPromptCategories);
        } else {
          setCategories(data.map(buildPromptCategoryInfo));
        }
      } catch (error) {
        console.error('Failed to load prompt categories:', error);
        setCategories(defaultPromptCategories);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  return useMemo(() => ({ categories, loading }), [categories, loading]);
}
