import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Template metadata interface
export interface TemplateMetadata {
  id: number;
  name: string;
  type: 'waiting-list' | 'prescription' | 'medication-record' | 'consent-form' | 'vital-signs' | 'blood-sugar' | 'weight-control';
  original_name: string;
  storage_path: string;
  upload_date: string;
  file_size: number;
  description?: string;
  extracted_format: any;
}

// Template metadata functions
export async function getTemplatesMetadata() {
  const { data, error } = await supabase
    .from('templates_metadata')
    .select('*')
    .order('upload_date', { ascending: false });

  if (error) {
    console.error('Error fetching templates metadata:', error);
    throw error;
  }

  return data;
}

export async function createTemplateMetadata(metadata: Omit<TemplateMetadata, 'id' | 'upload_date'>) {
  const { data, error } = await supabase
    .from('templates_metadata')
    .insert([metadata])
    .select()
    .single();

  if (error) {
    console.error('Error creating template metadata:', error);
    throw error;
  }

  return data;
}

export async function deleteTemplateMetadata(id: number) {
  const { error } = await supabase
    .from('templates_metadata')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting template metadata:', error);
    throw error;
  }
}

export async function uploadTemplateFile(file: File, path: string) {
  const { data, error } = await supabase.storage
    .from('templates')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading template file:', error);
    throw error;
  }

  return data;
}

export async function deleteTemplateFile(path: string) {
  const { error } = await supabase.storage
    .from('templates')
    .remove([path]);

  if (error) {
    console.error('Error deleting template file:', error);
    throw error;
  }
}

export async function getPublicTemplateUrl(path: string) {
  const { data } = supabase.storage
    .from('templates')
    .getPublicUrl(path);

  return data.publicUrl;
}