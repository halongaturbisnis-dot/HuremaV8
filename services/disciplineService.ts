import { supabase } from '../lib/supabase';
import { WarningLog, WarningLogExtended, WarningLogInput, TerminationLog, TerminationLogExtended, TerminationLogInput } from '../types';
import { accountService } from './accountService';
import { financeService } from './financeService';
import { contractService } from './contractService';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const sanitizePayload = (payload: any) => {
  const sanitized = { ...payload };
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === '' || sanitized[key] === undefined) {
      sanitized[key] = null;
    }
  });
  return sanitized;
};

const mapWarningTypeToDB = (type: string) => {
  if (type.includes('SP1')) return 'SP1';
  if (type.includes('SP2')) return 'SP2';
  if (type.includes('SP3')) return 'SP3';
  if (type.includes('Teguran')) return 'Teguran';
  return type;
};

const mapWarningTypeToUI = (type: string) => {
  if (type === 'SP1') return 'Surat Peringatan 1 (SP1)';
  if (type === 'SP2') return 'Surat Peringatan 2 (SP2)';
  if (type === 'SP3') return 'Surat Peringatan 3 (SP3)';
  if (type === 'Teguran') return 'Teguran Lisan';
  return type;
};

const mapTerminationTypeToDB = (type: string) => {
  if (type.includes('Resign')) return 'Resign';
  if (type.includes('Pemecatan') || type.includes('PHK')) return 'Pemecatan / PHK';
  return type;
};

const mapTerminationTypeToUI = (type: string) => {
  if (type === 'Resign') return 'Resign';
  if (type === 'Pemecatan' || type === 'Pemecatan / PHK') return 'Pemecatan / PHK';
  return type;
};

export const disciplineService = {
  // --- Warnings ---
  async getWarningsAll(page: number = 1, limit: number = 25, searchQuery: string = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('account_warning_logs')
      .select('*, account:accounts!inner(full_name, internal_nik, role, access_code, photo_google_id)', { count: 'exact' })
      .not('account.access_code', 'ilike', '%SPADMIN%');

    if (searchQuery) {
      const accountIds = await accountService.searchIds(searchQuery);
      if (accountIds.length > 0) {
        query = query.or(`warning_type.ilike.%${searchQuery}%,reason.ilike.%${searchQuery}%,account_id.in.(${accountIds.join(',')})`);
      } else {
        query = query.or(`warning_type.ilike.%${searchQuery}%,reason.ilike.%${searchQuery}%`);
      }
    }

    const { data, error, count } = await query
      .order('issue_date', { ascending: false })
      .range(from, to);

    if (error) throw error;
    
    const mappedData = (data || []).map(item => ({
      ...item,
      warning_type: mapWarningTypeToUI(item.warning_type)
    }));

    return { data: mappedData as WarningLogExtended[], count: count || 0 };
  },

  async getWarningsByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_warning_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('issue_date', { ascending: false });
    if (error) throw error;
    
    const mappedData = (data || []).map(item => ({
      ...item,
      warning_type: mapWarningTypeToUI(item.warning_type)
    }));

    return mappedData as WarningLog[];
  },

  async createWarning(input: WarningLogInput) {
    const sanitized = sanitizePayload({
      ...input,
      warning_type: mapWarningTypeToDB(input.warning_type)
    });
    const { data, error } = await supabase
      .from('account_warning_logs')
      .insert([sanitized])
      .select();
    if (error) throw error;
    return { ...data[0], warning_type: mapWarningTypeToUI(data[0].warning_type) } as WarningLog;
  },

  async updateWarning(id: string, input: Partial<WarningLogInput>) {
    if (!id) throw new Error('ID Peringatan tidak valid');

    const sanitized = {
      ...input,
      warning_type: input.warning_type ? mapWarningTypeToDB(input.warning_type) : undefined
    };
    if (sanitized.file_id === '' || sanitized.file_id === undefined) sanitized.file_id = null;

    // Remove id from payload if it exists to prevent updating the primary key
    if ('id' in sanitized) delete (sanitized as any).id;

    const { data, error } = await supabase
      .from('account_warning_logs')
      .update(sanitized)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    // Fetch the record to confirm it exists if update returned no data
    if (!data || data.length === 0) {
      const { data: checkData, error: checkError } = await supabase
        .from('account_warning_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (checkError || !checkData) throw new Error('Data peringatan tidak ditemukan');
      return { ...checkData, warning_type: mapWarningTypeToUI(checkData.warning_type) } as WarningLog;
    }

    const updatedData = data[0];
    return { ...updatedData, warning_type: mapWarningTypeToUI(updatedData.warning_type) } as WarningLog;
  },

  async updateTermination(id: string, input: Partial<TerminationLogInput>) {
    if (!id) throw new Error('ID Pengakhiran tidak valid');

    const sanitized = { ...input };
    if (sanitized.file_id === '' || sanitized.file_id === undefined) sanitized.file_id = null;
    
    // Remove id from payload if it exists
    if ('id' in sanitized) delete (sanitized as any).id;

    const { data, error } = await supabase
      .from('account_termination_logs')
      .update(sanitized)
      .eq('id', id)
      .select();

    if (error) throw error;
    
    // Fetch the record to confirm it exists if update returned no data
    if (!data || data.length === 0) {
      const { data: checkData, error: checkError } = await supabase
        .from('account_termination_logs')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (checkError || !checkData) throw new Error('Data pengakhiran tidak ditemukan');
      return checkData as TerminationLog;
    }

    const updatedData = data[0];

    // Update end_date di profile akun jika termination_date berubah
    if (input.account_id && input.termination_date) {
      await accountService.update(input.account_id, {
        end_date: input.termination_date
      });
    }

    return updatedData as TerminationLog;
  },

  async deleteWarning(id: string) {
    // 1. Ambil ID file
    const { data } = await supabase.from('account_warning_logs').select('file_id').eq('id', id).single();
    
    // 2. Hapus file dari Drive
    if (data?.file_id) {
      const { googleDriveService } = await import('./googleDriveService');
      await googleDriveService.deleteFile(data.file_id);
    }

    // 3. Hapus dari DB
    const { error } = await supabase.from('account_warning_logs').delete().eq('id', id);
    if (error) throw error;
    return true;
  },

  async bulkDeleteWarnings(ids: string[]) {
    for (const id of ids) {
      await this.deleteWarning(id);
    }
    return true;
  },

  // --- Terminations ---
  async getTerminationsAll(page: number = 1, limit: number = 25, searchQuery: string = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('account_termination_logs')
      .select('*, account:accounts!inner(full_name, internal_nik, role, access_code, photo_google_id)', { count: 'exact' })
      .not('account.access_code', 'ilike', '%SPADMIN%');

    if (searchQuery) {
      const accountIds = await accountService.searchIds(searchQuery);
      if (accountIds.length > 0) {
        query = query.or(`termination_type.ilike.%${searchQuery}%,reason.ilike.%${searchQuery}%,account_id.in.(${accountIds.join(',')})`);
      } else {
        query = query.or(`termination_type.ilike.%${searchQuery}%,reason.ilike.%${searchQuery}%`);
      }
    }

    const { data, error, count } = await query
      .order('termination_date', { ascending: false })
      .range(from, to);

    if (error) throw error;
    
    const mappedData = (data || []).map(item => ({
      ...item,
      termination_type: mapTerminationTypeToUI(item.termination_type)
    }));

    return { data: mappedData as TerminationLogExtended[], count: count || 0 };
  },

  async getTerminationByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_termination_logs')
      .select('*')
      .eq('account_id', accountId)
      .order('termination_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    
    if (!data) return null;

    return {
      ...data,
      termination_type: mapTerminationTypeToUI(data.termination_type)
    } as TerminationLog;
  },

  async createTermination(input: TerminationLogInput) {
    const sanitized = sanitizePayload({
      ...input,
      termination_type: mapTerminationTypeToDB(input.termination_type)
    });
    const { data, error } = await supabase
      .from('account_termination_logs')
      .insert([sanitized])
      .select();
    if (error) throw error;

    // Otomatis update end_date di profile akun
    await accountService.update(input.account_id, {
      end_date: input.termination_date
    });

    // Create Compensation Record if amount > 0
    if (input.severance_amount > 0 || input.penalty_amount > 0) {
      const dbTerminationType = mapTerminationTypeToDB(input.termination_type) as 'Resign' | 'Pemecatan / PHK';
      await financeService.createCompensation({
        account_id: input.account_id,
        termination_type: dbTerminationType,
        termination_date: input.termination_date,
        amount: input.termination_type.includes('PHK') ? input.severance_amount : input.penalty_amount,
        type: input.termination_type.includes('PHK') ? 'Severance' : 'Penalty',
        reason: input.reason
      });
    }

    return { ...data[0], termination_type: mapTerminationTypeToUI(data[0].termination_type) } as TerminationLog;
  },

  async deleteTermination(id: string, accountId: string) {
    // 1. Ambil data termination untuk keperluan sinkronisasi
    const { data: terminationData, error: fetchError } = await supabase
      .from('account_termination_logs')
      .select('file_id, termination_date')
      .eq('id', id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // 2. Hapus file dari Drive
    if (terminationData?.file_id) {
      const { googleDriveService } = await import('./googleDriveService');
      await googleDriveService.deleteFile(terminationData.file_id);
    }

    // 3. Hapus Kompensasi terkait
    if (terminationData?.termination_date) {
      await financeService.deleteCompensationByTermination(accountId, terminationData.termination_date);
    }

    // 4. Hapus dari DB
    const { error } = await supabase.from('account_termination_logs').delete().eq('id', id);
    if (error) throw error;

    // 5. Aktifkan kembali akun dengan mensinkronisasi status dan tanggal dari kontrak terakhir
    await contractService.syncAccountStatusAndDates(accountId);
    
    return true;
  },

  async bulkDeleteTerminations(items: { id: string, account_id: string }[]) {
    for (const item of items) {
      await this.deleteTermination(item.id, item.account_id);
    }
    return true;
  },

  // --- Import / Export ---
  async downloadWarningTemplate() {
    const activeFilter = accountService.getActiveFilter();
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, internal_nik, full_name')
      .or(activeFilter)
      .not('access_code', 'ilike', '%SPADMIN%');

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Warning_Import');
    
    // Row 1: Headers
    ws.addRow(['Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 'Jenis Peringatan (*)', 'Alasan (*)', 'Tanggal (YYYY-MM-DD) (*)']);
    
    // Row 2: Descriptions
    ws.addRow([
      'ID Sistem (Jangan diubah)', 
      'NIK Karyawan', 
      'Nama Lengkap', 
      'Pilih: Teguran Lisan, Surat Peringatan 1 (SP1), Surat Peringatan 2 (SP2), Surat Peringatan 3 (SP3)', 
      'Alasan pemberian sanksi', 
      'Format: YYYY-MM-DD'
    ]);

    // Row 3: Example
    ws.addRow([
      'uuid-example', 
      'NIK001', 
      'Contoh Nama', 
      'Surat Peringatan 1 (SP1)', 
      'Melanggar peraturan perusahaan pasal 5', 
      new Date().toISOString().split('T')[0]
    ]);

    // Row 4 onwards: Data
    accounts?.forEach(acc => {
      ws.addRow([acc.id, acc.internal_nik, acc.full_name, '', '', '']);
    });

    // Styling
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      const isMandatory = cell.value?.toString().includes('(*)');
      cell.font = { bold: true, color: { argb: isMandatory ? 'FFFF0000' : 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    const descRow = ws.getRow(2);
    descRow.font = { italic: true, size: 10 };
    descRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };

    const types = ['Teguran Lisan', 'Surat Peringatan 1 (SP1)', 'Surat Peringatan 2 (SP2)', 'Surat Peringatan 3 (SP3)'];
    const totalRows = 3 + (accounts?.length || 0);
    for (let i = 4; i <= totalRows; i++) {
      ws.getCell(`D${i}`).dataValidation = { 
        type: 'list', 
        allowBlank: true, 
        formulae: [`"${types.join(',')}"`] 
      };
      const dateCell = ws.getCell(`F${i}`);
      dateCell.dataValidation = { 
        type: 'date', 
        operator: 'greaterThan', 
        allowBlank: true, 
        formulae: [new Date(1900, 0, 1)] 
      };
      dateCell.numFmt = 'yyyy-mm-dd';
    }

    ws.columns.forEach((col, idx) => { col.width = [20, 15, 25, 20, 30, 22][idx]; });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `HUREMA_Warning_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processWarningImport(file: File, bulkFiles: Record<string, string> = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          
          const results = jsonData.slice(2).map((row: any) => {
            const parseDate = (val: any) => {
              if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000).toISOString().split('T')[0];
              return val;
            };
            
            const accountId = String(row['Account ID (Hidden)'] || '').trim();
            const internalNik = String(row['NIK Internal'] || '').trim();
            const fullName = String(row['Nama Karyawan'] || '').trim();
            const issueDate = parseDate(row['Tanggal (YYYY-MM-DD) (*)']);
            const warningType = String(row['Jenis Peringatan (*)'] || '').trim();
            const reason = row['Alasan (*)'];

            // Smart matching logic for files - Based on Employee Name only
            let matchedFileId = null;
            let matchedFilename = null;
            if (fullName) {
              const normalizedName = fullName.toLowerCase();
              Object.entries(bulkFiles).forEach(([fileName, fileId]) => {
                const normalizedFileName = fileName.toLowerCase();
                if (normalizedFileName.includes(normalizedName)) {
                  matchedFileId = fileId;
                  matchedFilename = fileName;
                }
              });
            }

            const requiredFields = [
              'Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 
              'Jenis Peringatan (*)', 'Alasan (*)', 'Tanggal (YYYY-MM-DD) (*)'
            ];

            let errorMsg = '';
            const missingFields = requiredFields.filter(field => {
              const val = row[field];
              return val === undefined || val === null || String(val).trim() === '';
            });

            if (missingFields.length > 0) {
              const cleanNames = missingFields.map(f => f.replace(' (*)', '').replace(' (YYYY-MM-DD)', ''));
              errorMsg = `Kolom wajib belum lengkap: [${cleanNames.join(', ')}]`;
            } else if (accountId === 'ID_AKUN' || accountId === 'Jangan diubah' || accountId === 'uuid-example') {
              errorMsg = 'Account ID tidak valid (masih menggunakan placeholder template)';
            } else {
              // Validate Warning Type
              const validTypes = ['Teguran Lisan', 'Surat Peringatan 1 (SP1)', 'Surat Peringatan 2 (SP2)', 'Surat Peringatan 3 (SP3)'];
              if (!validTypes.includes(warningType)) {
                errorMsg = `Jenis Peringatan '${warningType}' tidak valid. Gunakan pilihan dari template.`;
              }
            }

            const isValid = !errorMsg;

            return {
              account_id: accountId,
              full_name: fullName,
              internal_nik: internalNik,
              warning_type: warningType,
              reason: reason,
              issue_date: issueDate,
              file_id: matchedFileId,
              matched_filename: matchedFilename,
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

  async commitWarningImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    if (validData.length === 0) return;

    const payload = validData.map(item => ({
      account_id: item.account_id,
      warning_type: mapWarningTypeToDB(item.warning_type),
      reason: item.reason,
      issue_date: item.issue_date,
      file_id: item.file_id || null
    }));

    const { error } = await supabase.from('account_warning_logs').insert(payload);
    if (error) throw error;
  },

  // --- Termination Import Logic ---
  async downloadTerminationTemplate() {
    const activeFilter = accountService.getActiveFilter();
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, internal_nik, full_name')
      .or(activeFilter)
      .not('access_code', 'ilike', '%SPADMIN%');

    if (error) throw error;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Termination_Import');
    
    // Row 1: Headers
    ws.addRow(['Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 'Tipe Exit (*)', 'Tanggal Exit (YYYY-MM-DD) (*)', 'Alasan (*)', 'Uang Pesangon (PHK)', 'Biaya Penalti (Resign)']);
    
    // Row 2: Descriptions
    ws.addRow([
      'ID Sistem (Jangan diubah)', 
      'NIK Karyawan', 
      'Nama Lengkap', 
      'Pilih: Resign, Pemecatan / PHK', 
      'Format: YYYY-MM-DD', 
      'Alasan berhenti bekerja', 
      'Jumlah pesangon (jika ada)', 
      'Jumlah penalti (jika ada)'
    ]);

    // Row 3: Example
    ws.addRow([
      'uuid-example', 
      'NIK002', 
      'Contoh Nama', 
      'Resign', 
      new Date().toISOString().split('T')[0], 
      'Mendapatkan tawaran di tempat lain', 
      0, 
      0
    ]);

    // Row 4 onwards: Data
    accounts?.forEach(acc => {
      ws.addRow([acc.id, acc.internal_nik, acc.full_name, '', '', '', 0, 0]);
    });

    // Styling
    const headerRow = ws.getRow(1);
    headerRow.eachCell((cell) => {
      const isMandatory = cell.value?.toString().includes('(*)');
      cell.font = { bold: true, color: { argb: isMandatory ? 'FFFF0000' : 'FF000000' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0E0E0' } };
    });

    const descRow = ws.getRow(2);
    descRow.font = { italic: true, size: 10 };
    descRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9C4' } };

    const types = ['Resign', 'Pemecatan / PHK'];
    const totalRows = 3 + (accounts?.length || 0);
    for (let i = 4; i <= totalRows; i++) {
      ws.getCell(`D${i}`).dataValidation = { 
        type: 'list', 
        allowBlank: true, 
        formulae: [`"${types.join(',')}"`] 
      };
      const dateCell = ws.getCell(`E${i}`);
      dateCell.dataValidation = { 
        type: 'date', 
        operator: 'greaterThan', 
        allowBlank: true, 
        formulae: [new Date(1900, 0, 1)] 
      };
      dateCell.numFmt = 'yyyy-mm-dd';
    }

    ws.columns.forEach((col, idx) => { col.width = [20, 15, 25, 15, 22, 30, 20, 20][idx]; });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `HUREMA_Termination_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processTerminationImport(file: File, bulkFiles: Record<string, string> = {}) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet, { range: 0 });
          
          const results = jsonData.slice(2).map((row: any) => {
            const parseDate = (val: any) => {
              if (typeof val === 'number') return new Date((val - 25569) * 86400 * 1000).toISOString().split('T')[0];
              return val;
            };

            const accountId = String(row['Account ID (Hidden)'] || '').trim();
            const internalNik = String(row['NIK Internal'] || '').trim();
            const fullName = String(row['Nama Karyawan'] || '').trim();
            const termDate = parseDate(row['Tanggal Exit (YYYY-MM-DD) (*)']);
            const type = String(row['Tipe Exit (*)'] || '').trim();
            const reason = row['Alasan (*)'];
            
            let severance = Number(row['Uang Pesangon (PHK)']) || 0;
            let penalty = Number(row['Biaya Penalti (Resign)']) || 0;
            let mitigationApplied = false;

            // Mitigation Logic
            if (type === 'Resign' && severance > 0) {
              severance = 0;
              mitigationApplied = true;
            } else if (type === 'Pemecatan / PHK' && penalty > 0) {
              penalty = 0;
              mitigationApplied = true;
            }

            // Smart matching logic for files - Based on Employee Name only
            let matchedFileId = null;
            let matchedFilename = null;
            if (fullName) {
              const normalizedName = fullName.toLowerCase();
              Object.entries(bulkFiles).forEach(([fileName, fileId]) => {
                const normalizedFileName = fileName.toLowerCase();
                if (normalizedFileName.includes(normalizedName)) {
                  matchedFileId = fileId;
                  matchedFilename = fileName;
                }
              });
            }

            const requiredFields = [
              'Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 
              'Tipe Exit (*)', 'Tanggal Exit (YYYY-MM-DD) (*)', 'Alasan (*)'
            ];

            let errorMsg = '';
            const missingFields = requiredFields.filter(field => {
              const val = row[field];
              return val === undefined || val === null || String(val).trim() === '';
            });

            if (missingFields.length > 0) {
              const cleanNames = missingFields.map(f => f.replace(' (*)', '').replace(' (YYYY-MM-DD)', ''));
              errorMsg = `Kolom wajib belum lengkap: [${cleanNames.join(', ')}]`;
            } else if (accountId === 'ID_AKUN' || accountId === 'Jangan diubah' || accountId === 'uuid-example') {
              errorMsg = 'Account ID tidak valid (masih menggunakan placeholder template)';
            } else {
              // Validate Termination Type and Amounts
              const validTypes = ['Resign', 'Pemecatan / PHK'];
              if (!validTypes.includes(type)) {
                errorMsg = `Tipe Exit '${type}' tidak valid. Gunakan pilihan dari template.`;
              } else if (type === 'Resign') {
                if (severance > 0) {
                  errorMsg = 'Resign tidak boleh memiliki uang pesangon.';
                }
              } else if (type === 'Pemecatan / PHK') {
                if (penalty > 0) {
                  errorMsg = 'Pemecatan tidak boleh memiliki biaya penalti.';
                }
              }
            }

            const isValid = !errorMsg;

            return {
              account_id: accountId,
              full_name: fullName,
              internal_nik: internalNik,
              termination_type: type,
              termination_date: termDate,
              reason: reason,
              severance_amount: severance,
              penalty_amount: penalty,
              file_id: matchedFileId,
              matched_filename: matchedFilename,
              mitigationApplied,
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

  async commitTerminationImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    if (validData.length === 0) return;

    // 1. Bulk Insert Termination Logs
    const logPayload = validData.map(item => ({
      account_id: item.account_id,
      termination_type: mapTerminationTypeToDB(item.termination_type),
      termination_date: item.termination_date,
      reason: item.reason,
      severance_amount: Number(item.severance_amount) || 0,
      penalty_amount: Number(item.penalty_amount) || 0,
      file_id: item.file_id || null
    }));

    const { error: logError } = await supabase.from('account_termination_logs').insert(logPayload);
    if (logError) throw logError;

    // 2. Update Accounts end_date and Create Compensation
    for (const item of validData) {
      await accountService.update(item.account_id, {
        end_date: item.termination_date
      });

      if (item.severance_amount > 0 || item.penalty_amount > 0) {
        const isSeverance = item.termination_type.includes('PHK');
        const dbTerminationType = mapTerminationTypeToDB(item.termination_type) as 'Resign' | 'Pemecatan / PHK';
        await financeService.createCompensation({
          account_id: item.account_id,
          termination_type: dbTerminationType,
          termination_date: item.termination_date,
          amount: isSeverance ? item.severance_amount : item.penalty_amount,
          type: isSeverance ? 'Severance' : 'Penalty',
          reason: item.reason
        });
      }
    }
  }
};