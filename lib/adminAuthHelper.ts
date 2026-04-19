import { Submission } from '../types';

/**
 * Check if the entry was created by an admin
 */
export const AdminMadeDeletion = (req: Submission): boolean => {
  if (!req || !req.submission_data) return false;
  
  // Handle potential stringified JSON
  let data;
  try {
    data = typeof req.submission_data === 'string' 
      ? JSON.parse(req.submission_data) 
      : req.submission_data;
  } catch (e) {
    console.error('Error parsing submission_data:', e);
    return false;
  }
    
  return data?.created_by_role === 'admin';
};
