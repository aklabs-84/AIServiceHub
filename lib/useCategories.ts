import { useEffect, useMemo, useState } from 'react';
import { db, getBrowserClient } from '@/lib/database';
import type { Category } from '@/types/database';
import { CategoryInfo } from '@/lib/categories';
import { PromptCategoryInfo } from '@/lib/promptCategories';
import {
  appCategoryDefaults,
  appIconOptions,
  promptCategoryDefaults,
  promptIconOptions,
} from '@/lib/categoryOptions';

const buildAppCategoryInfo = (category: Category): CategoryInfo => {
  const iconKey = category.icon as keyof typeof appIconOptions;
  return {
    value: category.value,
    label: category.label,
    color: category.color,
    icon: appIconOptions[iconKey] || appIconOptions.puzzle,
  };
};

const buildPromptCategoryInfo = (category: Category): PromptCategoryInfo => {
  const iconKey = category.icon as keyof typeof promptIconOptions;
  return {
    value: category.value,
    label: category.label,
    color: category.color,
    icon: promptIconOptions[iconKey] || promptIconOptions.smile,
  };
};

const defaultAppCategories = appCategoryDefaults.map((item, idx) => buildAppCategoryInfo({
  id: item.value,
  type: 'app',
  value: item.value,
  label: item.label,
  color: item.color,
  icon: item.icon,
  sortOrder: idx,
}));

const defaultPromptCategories = promptCategoryDefaults.map((item, idx) => buildPromptCategoryInfo({
  id: item.value,
  type: 'prompt',
  value: item.value,
  label: item.label,
  color: item.color,
  icon: item.icon,
  sortOrder: idx,
}));

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

let appCategoryCache: { data: CategoryInfo[]; expiresAt: number } | null = null;
let appCategoryFetch: Promise<Category[] | null> | null = null;

let promptCategoryCache: { data: PromptCategoryInfo[]; expiresAt: number } | null = null;
let promptCategoryFetch: Promise<Category[] | null> | null = null;

const getCachedAppCategories = () => {
  if (appCategoryCache && appCategoryCache.expiresAt > Date.now()) {
    return appCategoryCache.data;
  }
  return null;
};

const getCachedPromptCategories = () => {
  if (promptCategoryCache && promptCategoryCache.expiresAt > Date.now()) {
    return promptCategoryCache.data;
  }
  return null;
};

const setAppCategoryCache = (data: CategoryInfo[]) => {
  appCategoryCache = { data, expiresAt: Date.now() + CATEGORY_CACHE_TTL_MS };
};

const setPromptCategoryCache = (data: PromptCategoryInfo[]) => {
  promptCategoryCache = { data, expiresAt: Date.now() + CATEGORY_CACHE_TTL_MS };
};

export function useAppCategories() {
  const [categories, setCategories] = useState<CategoryInfo[]>(defaultAppCategories);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const cached = getCachedAppCategories();
    if (cached) {
      setCategories(cached);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        if (!appCategoryFetch) {
          const supabase = getBrowserClient();
          appCategoryFetch = db.categories.getByType(supabase, 'app');
        }
        const data = await appCategoryFetch;
        if (!active) return;
        if (data && data.length > 0) {
          const mapped = data.map(buildAppCategoryInfo);
          const unique = Array.from(new Map(mapped.map(item => [item.value, item])).values());
          setCategories(unique);
          setAppCategoryCache(unique);
        } else {
          setCategories(defaultAppCategories);
          setAppCategoryCache(defaultAppCategories);
        }
      } catch (error) {
        console.error('Failed to load app categories:', error);
        if (active) {
          setCategories(defaultAppCategories);
        }
      } finally {
        appCategoryFetch = null;
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
    const cached = getCachedPromptCategories();
    if (cached) {
      setCategories(cached);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    const load = async () => {
      setLoading(true);
      try {
        if (!promptCategoryFetch) {
          const supabase = getBrowserClient();
          promptCategoryFetch = db.categories.getByType(supabase, 'prompt');
        }
        const data = await promptCategoryFetch;
        if (!active) return;
        if (data && data.length > 0) {
          const mapped = data.map(buildPromptCategoryInfo);
          const unique = Array.from(new Map(mapped.map(item => [item.value, item])).values());
          setCategories(unique);
          setPromptCategoryCache(unique);
        } else {
          setCategories(defaultPromptCategories);
          setPromptCategoryCache(defaultPromptCategories);
        }
      } catch (error) {
        console.error('Failed to load prompt categories:', error);
        if (active) {
          setCategories(defaultPromptCategories);
        }
      } finally {
        promptCategoryFetch = null;
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
