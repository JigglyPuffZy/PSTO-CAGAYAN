import { getSupabase } from './supabase';

export function proposalPublicUrl(filename: string | null | undefined): string | null {
  if (!filename) return null;
  if (filename.startsWith('http') || filename.startsWith('blob:')) return filename;
  const { data } = getSupabase().storage.from('proposals').getPublicUrl(filename);
  return data.publicUrl;
}

export async function uploadProposal(file: File): Promise<string> {
  const safe = file.name.replace(/[^\w.-]+/g, '_');
  const path = `${Date.now()}_${safe}`;
  const { error } = await getSupabase().storage.from('proposals').upload(path, file, {
    contentType: file.type || 'application/pdf',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}
