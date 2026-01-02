export type CategoryType = 'app' | 'prompt';

export interface CategoryRecord {
  id: string;
  type: CategoryType;
  value: string;
  label: string;
  color: string;
  icon: string;
  createdAt?: Date;
}

export interface CategoryInput {
  type: CategoryType;
  value: string;
  label: string;
  color: string;
  icon: string;
}
