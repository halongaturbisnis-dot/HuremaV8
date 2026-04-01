import { supabase } from '../lib/supabase';
import { AppSetting } from '../types';

// Simple in-memory cache to prevent redundant API calls
const settingsCache: Record<string, { value: any, timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const settingsService = {
  /**
   * Mendapatkan nilai pengaturan berdasarkan key
   */
  async getSetting(key: string, defaultValue: any = null): Promise<any> {
    // Check cache first
    const cached = settingsCache[key];
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      return cached.value;
    }

    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      
      if (error) throw error;
      const value = data ? data.value : defaultValue;
      
      // Update cache
      settingsCache[key] = { value, timestamp: Date.now() };
      
      return value;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return defaultValue;
    }
  },

  /**
   * Mendapatkan semua pengaturan
   */
  async getAll(): Promise<AppSetting[]> {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*');
      
      if (error) {
        // Jika tabel tidak ditemukan (PGRST205), kembalikan array kosong tanpa melempar error
        if (error.code === 'PGRST205') return [];
        throw error;
      }

      // Update cache for each setting
      if (data) {
        data.forEach((setting: AppSetting) => {
          settingsCache[setting.key] = { value: setting.value, timestamp: Date.now() };
        });
      }

      return data as AppSetting[];
    } catch (error) {
      console.error("Error fetching all settings:", error);
      return [];
    }
  },

  /**
   * Memperbarui atau membuat pengaturan baru
   */
  async updateSetting(key: string, value: any, description?: string) {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ 
          key, 
          value, 
          description, 
          updated_at: new Date().toISOString() 
        });
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      console.error("Error updating setting:", error);
      throw error;
    }
  }
};