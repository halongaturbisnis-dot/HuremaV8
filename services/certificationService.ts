
import { supabase } from '../lib/supabase';
import { AccountCertification, AccountCertificationExtended, AccountCertificationInput } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

export const certificationService = {
  async getAllGlobal(page: number = 1, limit: number = 25, searchQuery: string = '', filterType: 'all' | 'this_month' = 'all') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('account_certifications')
      .select(`
        *,
        account:accounts!inner(full_name, internal_nik, role, access_code, photo_google_id)
      `, { count: 'exact' })
      .not('account.access_code', 'ilike', '%SPADMIN%');

    if (searchQuery) {
      const accountIds = await accountService.searchIds(searchQuery);
      if (accountIds.length > 0) {
        query = query.or(`cert_name.ilike.%${searchQuery}%,cert_type.ilike.%${searchQuery}%,account_id.in.(${accountIds.join(',')})`);
      } else {
        query = query.or(`cert_name.ilike.%${searchQuery}%,cert_type.ilike.%${searchQuery}%`);
      }
    }

    if (filterType === 'this_month') {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
      query = query.gte('entry_date', firstDay).lte('entry_date', lastDay);
    }

    const { data, error, count } = await query
      .order('entry_date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return { data: data as AccountCertificationExtended[], count: count || 0 };
  },

  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_certifications')
      .select('*')
      .eq('account_id', accountId)
      .order('cert_date', { ascending: false });
    
    if (error) throw error;
    return (data || []) as AccountCertification[];
  },

  async getUniqueCertTypes() {
    const { data, error } = await supabase
      .from('account_certifications')
      .select('cert_type');
    
    if (error) throw error;
    const types = data.map(d => d.cert_type).filter(Boolean);
    return Array.from(new Set(types)).sort();
  },

  async create(input: AccountCertificationInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_certifications')
      .insert([sanitized])
      .select();
    
    if (error) throw error;
    return data[0] as AccountCertification;
  },

  async update(id: string, input: Partial<AccountCertificationInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_certifications')
      .update(sanitized)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0] as AccountCertification;
  },

  async delete(id: string) {
    // 1. Ambil ID file
    const { data } = await supabase.from('account_certifications').select('file_id').eq('id', id).single();
    
    // 2. Hapus file dari Drive
    if (data?.file_id) {
      const { googleDriveService } = await import('./googleDriveService');
      await googleDriveService.deleteFile(data.file_id);
    }

    // 3. Hapus dari DB
    const { error } = await supabase
      .from('account_certifications')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  },

  async bulkDelete(ids: string[]) {
    for (const id of ids) {
      await this.delete(id);
    }
    return true;
  },

  async downloadTemplate() {
    const accounts = await accountService.getAll();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Certification_Import');
    
    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Jenis Sertifikasi (*)', 
      'Nama Sertifikasi (*)', 
      'Tanggal Sertifikasi (YYYY-MM-DD) (*)', 
      'Keterangan'
    ];
    ws.addRow(headers);

    // Add Description Row (Row 2)
    const descriptionRow = [
      'Jangan diubah', 'Referensi', 'Referensi', 'Wajib diisi',
      'Wajib diisi', 'Format: YYYY-MM-DD', 'Opsional'
    ];
    ws.addRow(descriptionRow);

    // Add Example Row (Row 3)
    const exampleRow = [
      'ID_AKUN', 
      'NIK001', 
      'Contoh Nama', 
      'Teknis', 
      'Sertifikasi K3 Umum', 
      new Date().toISOString().split('T')[0], 
      'Contoh pengisian data'
    ];
    ws.addRow(exampleRow);
    
    // Add All Accounts (Row 4 onwards)
    accounts
      .filter(acc => !acc.end_date || new Date(acc.end_date) > new Date())
      .forEach(acc => {
        ws.addRow([
          acc.id,
          acc.internal_nik,
          acc.full_name,
          '', '', '', ''
        ]);
      });

    // Style headers
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      const isMandatory = cell.value?.toString().includes('(*)');
      cell.font = { 
        bold: true, 
        color: { argb: isMandatory ? 'FFFF0000' : 'FF000000' } 
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Style description row
    const descRow = ws.getRow(2);
    descRow.font = { italic: true, size: 10 };
    descRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9C4' } // Light yellow
    };

    const totalRows = 3 + accounts.length;
    for (let i = 4; i <= totalRows; i++) {
      const dateCell = ws.getCell(`F${i}`);
      dateCell.dataValidation = {
        type: 'date',
        operator: 'greaterThan',
        allowBlank: true,
        formulae: [new Date(1900, 0, 1)]
      };
      dateCell.numFmt = 'yyyy-mm-dd';
    }

    ws.columns.forEach((col, idx) => {
      col.width = [20, 15, 25, 20, 25, 25, 25][idx];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `HUREMA_Certification_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);

          const results = jsonData
            .slice(2) // Skip "Referensi" and "Contoh" rows
            .filter((row: any) => {
              // Only filter out rows that are completely empty
              return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
            })
            .map((row: any) => {
              const formatExcelDate = (val: any) => {
                if (!val) return null;
                if (typeof val === 'number') {
                  const date = new Date((val - 25569) * 86400 * 1000);
                  if (isNaN(date.getTime())) return null;
                  return date.toISOString().split('T')[0];
                }
                const str = String(val).trim();
                if (!str) return null;

                // Handle DD/MM/YYYY or DD-MM-YYYY format
                const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
                if (ddmmyyyy) {
                  const day = ddmmyyyy[1].padStart(2, '0');
                  const month = ddmmyyyy[2].padStart(2, '0');
                  const year = ddmmyyyy[3];
                  return `${year}-${month}-${day}`;
                }

                if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
                const parsed = new Date(str);
                if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
                return str;
              };

              const accountId = String(row['Account ID (Hidden)'] || '').trim();
              const fullName = String(row['Nama Karyawan'] || '').trim();
              const internalNik = String(row['NIK Internal'] || '').trim();

              const requiredFields = [
                'Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 
                'Jenis Sertifikasi (*)', 'Nama Sertifikasi (*)', 
                'Tanggal Sertifikasi (YYYY-MM-DD) (*)'
              ];

              let errorMsg = '';
              const missingFields = requiredFields.filter(field => {
                const val = row[field];
                return val === undefined || val === null || String(val).trim() === '';
              });

              if (missingFields.length > 0) {
                const cleanNames = missingFields.map(f => f.replace(' (*)', '').replace(' (YYYY-MM-DD)', ''));
                errorMsg = `Kolom wajib belum lengkap: [${cleanNames.join(', ')}]`;
              } else if (accountId === 'ID_AKUN' || accountId === 'Jangan diubah') {
                errorMsg = 'Account ID tidak valid (masih menggunakan placeholder template)';
              }

              const isValid = !errorMsg;

              return {
                account_id: accountId,
                full_name: fullName,
                internal_nik: internalNik,
                cert_type: row['Jenis Sertifikasi (*)'],
                cert_name: row['Nama Sertifikasi (*)'],
                cert_date: formatExcelDate(row['Tanggal Sertifikasi (YYYY-MM-DD) (*)']),
                notes: row['Keterangan'] || row['Catatan / Keterangan'] || null,
                file_id: null, // Will be matched in modal
                isValid,
                errorMsg
              };
            });
          resolve(results);
        } catch (err) { reject(err); }
      };
      reader.readAsArrayBuffer(file);
    });
  },

  async commitImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    const results = [];
    for (const item of validData) {
      const res = await this.create({
        account_id: item.account_id,
        entry_date: new Date().toISOString().split('T')[0],
        cert_type: item.cert_type,
        cert_name: item.cert_name,
        cert_date: item.cert_date,
        notes: item.notes,
        file_id: item.file_id || null
      });
      results.push(res);
    }
    return results;
  }
};
