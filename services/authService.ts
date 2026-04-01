
import { supabase } from '../lib/supabase';
import { AuthUser } from '../types';
import { settingsService } from './settingsService';

const SESSION_KEY = 'hurema_user_session';
let cachedUser: AuthUser | null = null;

export const authService = {
  async login(accessCode: string, passwordRaw: string): Promise<AuthUser> {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, full_name, internal_nik, access_code, photo_google_id, schedule_type, gender, role, end_date, schedule_id, schedule:schedules(type)')
      .eq('access_code', accessCode)
      .eq('password', passwordRaw)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error('Kode Akses atau Password salah.');

    // Check if account is inactive
    if (data.end_date) {
      const today = new Date().toISOString().split('T')[0];
      if (data.end_date <= today) {
        throw new Error('Akun Anda sudah tidak aktif. Silakan hubungi Admin.');
      }
    }

    // Determine role based on database value or fallback to access code logic
    const role = data.role || ((data.access_code.startsWith('SP') || data.access_code.includes('ADM')) ? 'admin' : 'user');

    // Fetch Admin Permissions from app_settings
    const [hrAdmins, perfAdmins, finAdmins] = await Promise.all([
      settingsService.getSetting('admin_hr_ids', []),
      settingsService.getSetting('admin_performance_ids', []),
      settingsService.getSetting('admin_finance_ids', [])
    ]);

    const user: AuthUser = {
      ...data,
      schedule: Array.isArray(data.schedule) ? data.schedule[0] : data.schedule,
      role,
      is_hr_admin: hrAdmins.includes(data.id),
      is_performance_admin: perfAdmins.includes(data.id),
      is_finance_admin: finAdmins.includes(data.id)
    } as AuthUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    cachedUser = user;
    return user;
  },

  getCurrentUser(): AuthUser | null {
    if (cachedUser) return cachedUser;

    const session = localStorage.getItem(SESSION_KEY);
    if (!session) return null;
    try {
      cachedUser = JSON.parse(session);
      return cachedUser;
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem(SESSION_KEY);
    cachedUser = null;
    window.location.reload();
  }
};
