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

const buildAppCategoryInfo = (category: CategoryRecord): CategoryInfo => {
  const iconKey = category.icon as keyof typeof appIconOptions;
  return {
    value: category.value,
    label: category.label,
    color: category.color,
    icon: appIconOptions[iconKey] || appIconOptions.puzzle,
  };
};

const buildPromptCategoryInfo = (category: CategoryRecord): PromptCategoryInfo => {
  const iconKey = category.icon as keyof typeof promptIconOptions;
  return {
    value: category.value,
    label: category.label,
    color: category.color,
    icon: promptIconOptions[iconKey] || promptIconOptions.smile,
  };
};

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
      setLoading(true);
      try {
        const data = await getCategoriesByType('app');
        if (!active) return;
        if (data && data.length > 0) {
          const mapped = data.map(buildAppCategoryInfo);
          const unique = Array.from(new Map(mapped.map(item => [item.value, item])).values());
          setCategories(unique);
        } else {
          setCategories(defaultAppCategories);
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
      setLoading(true);
      try {
        const data = await getCategoriesByType('prompt');
        if (!active) return;
        if (data && data.length > 0) {
          const mapped = data.map(buildPromptCategoryInfo);
          const unique = Array.from(new Map(mapped.map(item => [item.value, item])).values());
          setCategories(unique);
        } else {
          setCategories(defaultPromptCategories);
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
