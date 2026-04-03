import { supabase } from '../lib/supabase';
import { DigitalDocument, DocumentInput } from '../types';

/**
 * Fungsi pembantu untuk membersihkan data sebelum dikirim ke Supabase.
 * Mengubah string kosong ('') menjadi null.
 */
const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const documentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('documents')
      .select(`*`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as DigitalDocument[];
  },

  async getUniqueDocTypes() {
    const { data, error } = await supabase
      .from('documents')
      .select('doc_type');
    
    if (error) throw error;
    const types = data.map(d => d.doc_type).filter(Boolean);
    return Array.from(new Set(types)).sort();
  },

  async create(input: DocumentInput) {
    const { data, error } = await supabase
      .from('documents')
      .insert([sanitizePayload(input)])
      .select()
      .single();
    
    if (error) throw error;
    return data as DigitalDocument;
  },

  async update(id: string, input: Partial<DocumentInput>) {
    const { data, error } = await supabase
      .from('documents')
      .update(sanitizePayload(input))
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as DigitalDocument;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};
