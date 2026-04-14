
import { supabase } from '../lib/supabase';
import { AccountContract, AccountContractExtended, AccountContractInput } from '../types';
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

export const contractService = {
  async getAllGlobal(page: number = 1, limit: number = 25, searchQuery: string = '', filterType: 'all' | 'active' | 'ending_soon' | 'expired' = 'all') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('account_contracts')
      .select(`
        *,
        account:accounts!inner(full_name, internal_nik, role, access_code, photo_google_id)
      `, { count: 'exact' })
      .not('account.access_code', 'ilike', '%SPADMIN%');

    if (searchQuery) {
      const accountIds = await accountService.searchIds(searchQuery);
      if (accountIds.length > 0) {
        query = query.or(`contract_number.ilike.%${searchQuery}%,contract_type.ilike.%${searchQuery}%,account_id.in.(${accountIds.join(',')})`);
      } else {
        query = query.or(`contract_number.ilike.%${searchQuery}%,contract_type.ilike.%${searchQuery}%`);
      }
    }

    const today = new Date().toISOString().split('T')[0];
    if (filterType === 'active') {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];
      query = query.or(`end_date.is.null,end_date.gt.${thirtyDaysLaterStr}`);
    } else if (filterType === 'ending_soon') {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
      const thirtyDaysLaterStr = thirtyDaysLater.toISOString().split('T')[0];
      query = query.gte('end_date', today).lte('end_date', thirtyDaysLaterStr);
    } else if (filterType === 'expired') {
      query = query.lt('end_date', today);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return { data: data as AccountContractExtended[], count: count || 0 };
  },

  async getByAccountId(accountId: string) {
    const { data, error } = await supabase
      .from('account_contracts')
      .select('*')
      .eq('account_id', accountId)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    return (data || []) as AccountContract[];
  },

  async getLatestContract(accountId: string) {
    const { data, error } = await supabase
      .from('account_contracts')
      .select('*')
      .eq('account_id', accountId)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data as AccountContract | null;
  },

  async create(input: AccountContractInput) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_contracts')
      .insert([sanitized])
      .select();
    
    if (error) throw error;

    // Sinkronisasi: Update status dan tanggal di profil utama karyawan berdasarkan log kontrak
    await this.syncAccountStatusAndDates(input.account_id);

    return data[0] as AccountContract;
  },

  async update(id: string, input: Partial<AccountContractInput>) {
    const sanitized = sanitizePayload(input);
    const { data, error } = await supabase
      .from('account_contracts')
      .update(sanitized)
      .eq('id', id)
      .select();
    
    if (error) throw error;

    // Ambil account_id jika tidak ada di input
    let accountId = input.account_id;
    if (!accountId) {
      accountId = data[0].account_id;
    }

    if (accountId) {
       await this.syncAccountStatusAndDates(accountId);
    }

    return data[0] as AccountContract;
  },

  async delete(id: string) {
    // 1. Ambil data kontrak untuk mendapatkan account_id dan file_id
    const { data } = await supabase.from('account_contracts').select('account_id, file_id').eq('id', id).single();
    const accountId = data?.account_id;
    
    // 2. Hapus file dari Drive
    if (data?.file_id) {
      const { googleDriveService } = await import('./googleDriveService');
      await googleDriveService.deleteFile(data.file_id);
    }

    // 3. Hapus dari DB
    const { error } = await supabase
      .from('account_contracts')
      .delete()
      .eq('id', id);
    if (error) throw error;

    // 4. Sinkronisasi
    if (accountId) {
      await this.syncAccountStatusAndDates(accountId);
    }

    return true;
  },

  async syncAccountStatusAndDates(accountId: string) {
    // 1. Ambil semua kontrak untuk akun ini, urutkan berdasarkan start_date
    const { data: contracts, error } = await supabase
      .from('account_contracts')
      .select('start_date, end_date, contract_type')
      .eq('account_id', accountId)
      .order('start_date', { ascending: true });

    if (error) throw error;
    if (!contracts || contracts.length === 0) return;

    // 2. Tentukan Tanggal Bergabung (kontrak paling awal)
    const earliestContract = contracts[0];
    const startDate = earliestContract.start_date;

    // 3. Tentukan Status dan Estimasi Berakhir (kontrak paling baru secara kronologis)
    // Kita urutkan ulang secara lokal untuk mendapatkan yang terbaru
    const sortedByLatest = [...contracts].sort((a, b) => 
      new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
    );
    const latestContract = sortedByLatest[0];

    // Mapping Jenis Kontrak ke Jenis Karyawan
    let employeeType = 'Kontrak';
    const cType = latestContract.contract_type;
    if (cType === 'PKWTT' || cType === 'PKWTT (Tetap)') employeeType = 'Tetap';
    else if (cType === 'Magang') employeeType = 'Magang';
    else if (cType === 'Harian') employeeType = 'Harian';
    else if (cType === 'PKWT' || cType === 'PKWT (Kontrak)') employeeType = 'Kontrak';
    // Addendum biasanya mengikuti status kontrak sebelumnya, default ke Kontrak jika ragu

    // Jika kontrak terbaru adalah PKWTT atau tidak punya end_date, maka end_date di accounts adalah null
    const newEndDate = (cType === 'PKWTT' || cType === 'PKWTT (Tetap)' || !latestContract.end_date) 
      ? null 
      : latestContract.end_date;

    await accountService.update(accountId, {
      start_date: startDate,
      employee_type: employeeType as 'Tetap' | 'Kontrak' | 'Harian' | 'Magang',
      end_date: newEndDate
    });
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
    const wsImport = workbook.addWorksheet('Contract_Import');
    
    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Nomor Kontrak (*)', 
      'Jenis Kontrak (*)', 
      'Tgl Mulai (YYYY-MM-DD) (*)', 
      'Tgl Akhir (YYYY-MM-DD) (*)', 
      'Keterangan'
    ];
    wsImport.addRow(headers);

    // Add Description Row (Row 2)
    const descriptionRow = [
      'Jangan diubah', 'Referensi', 'Referensi', 'Wajib diisi',
      'Pilih dari daftar', 'Format: YYYY-MM-DD', 'Format: YYYY-MM-DD (Kosongkan jika PKWTT)', 'Opsional'
    ];
    wsImport.addRow(descriptionRow);

    // Add Example Row (Row 3)
    const exampleRow = [
      'ID_AKUN', 
      'NIK001', 
      'Contoh Nama', 
      'KONTRAK/2024/001',
      'PKWT', 
      new Date().toISOString().split('T')[0], 
      new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], 
      'Perpanjangan Kontrak'
    ];
    wsImport.addRow(exampleRow);
    
    // Add All Accounts (Row 4 onwards)
    accounts.forEach(acc => {
      wsImport.addRow([
        acc.id,
        acc.internal_nik,
        acc.full_name,
        '', '', '', '', ''
      ]);
    });

    // Style headers
    const headerRow = wsImport.getRow(1);
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
    const descRow = wsImport.getRow(2);
    descRow.font = { italic: true, size: 10 };
    descRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFF9C4' } // Light yellow
    };

    const contractTypes = ['PKWT (Kontrak)', 'PKWTT (Tetap)', 'Magang', 'Harian'];
    const totalRows = 3 + accounts.length;
    for (let i = 4; i <= totalRows; i++) {
      wsImport.getCell(`E${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${contractTypes.join(',')}"`]
      };
    }

    wsImport.columns.forEach((col, idx) => {
      col.width = [20, 15, 25, 22, 18, 22, 22, 22][idx];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `HUREMA_Contract_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File, bulkFiles: Record<string, string> = {}) {
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

              const contractNumber = String(row['Nomor Kontrak (*)'] || '').trim();
              const accountId = String(row['Account ID (Hidden)'] || '').trim();
              const fullName = String(row['Nama Karyawan'] || '').trim();
              const internalNik = String(row['NIK Internal'] || '').trim();

              // Smart matching logic
              let matchedFileId = null;
              if (contractNumber) {
                const normalizedNo = contractNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                Object.entries(bulkFiles).forEach(([fileName, fileId]) => {
                  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                  if (normalizedFileName === normalizedNo) matchedFileId = fileId;
                });
              }

              const requiredFields = [
                'Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 
                'Nomor Kontrak (*)', 'Jenis Kontrak (*)', 
                'Tgl Mulai (YYYY-MM-DD) (*)'
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

              let rawContractType = String(row['Jenis Kontrak (*)'] || '').trim();
              let contractType = rawContractType;
              
              const validTypes = ['PKWT', 'PKWTT', 'Magang', 'Harian'];
              const typeMapping: Record<string, string> = {
                'PKWT (Kontrak)': 'PKWT',
                'PKWTT (Tetap)': 'PKWTT'
              };

              if (typeMapping[contractType]) {
                contractType = typeMapping[contractType];
              }

              if (!validTypes.includes(contractType)) {
                const msg = `Jenis Kontrak '${rawContractType}' tidak valid.`;
                errorMsg = errorMsg ? `${errorMsg}. ${msg}` : msg;
              }

              let startDate = formatExcelDate(row['Tgl Mulai (YYYY-MM-DD) (*)']);
              let endDate = formatExcelDate(row['Tgl Akhir (YYYY-MM-DD) (*)']);

              // Mitigation: PKWTT neutralization and non-PKWTT validation
              if (contractType === 'PKWTT') {
                endDate = null;
              } else if (!endDate && contractType !== 'PKWTT' && validTypes.includes(contractType)) {
                errorMsg = errorMsg ? `${errorMsg}. Tanggal Akhir wajib diisi` : 'Tanggal Akhir wajib diisi';
              }

              const isValid = !errorMsg;

              return {
                account_id: accountId,
                full_name: fullName,
                internal_nik: internalNik,
                contract_number: contractNumber,
                contract_type: contractType,
                start_date: startDate,
                end_date: endDate,
                notes: row['Keterangan'] || row['Catatan / Keterangan'] || null,
                file_id: matchedFileId,
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
        contract_number: item.contract_number,
        contract_type: item.contract_type,
        start_date: item.start_date,
        end_date: item.end_date,
        notes: item.notes,
        file_id: item.file_id || null
      });
      results.push(res);
    }
    return results;
  }
};
