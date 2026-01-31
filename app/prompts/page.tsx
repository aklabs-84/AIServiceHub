import PromptsClient from './PromptsClient';
import { getAllPromptsServer } from '@/lib/dbServer';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PromptsPage() {
  const prompts = await getAllPromptsServer();

  return <PromptsClient initialPrompts={prompts} />;
}
