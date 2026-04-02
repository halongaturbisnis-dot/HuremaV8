import { supabase } from '../lib/supabase';
import { HealthLogExtended } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';

export const healthService = {
  async getAllGlobal(page: number = 1, limit: number = 25, searchQuery: string = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('account_health_logs')
      .select(`
        *,
        account:accounts!inner(full_name, internal_nik, role, access_code, photo_google_id)
      `, { count: 'exact' })
      .not('account.access_code', 'ilike', '%SPADMIN%');

    if (searchQuery) {
      const accountIds = await accountService.searchIds(searchQuery);
      if (accountIds.length > 0) {
        query = query.or(`mcu_status.ilike.%${searchQuery}%,health_risk.ilike.%${searchQuery}%,account_id.in.(${accountIds.join(',')})`);
      } else {
        query = query.or(`mcu_status.ilike.%${searchQuery}%,health_risk.ilike.%${searchQuery}%`);
      }
    }

    const { data, error, count } = await query
      .order('change_date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return { data: data as HealthLogExtended[], count: count || 0 };
  },

  async downloadTemplate() {
    const accounts = await accountService.getAll();
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Health_Import');
    
    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Status Medis (*)', 
      'Risiko Kesehatan (*)', 
      'Tanggal Pemeriksaan (YYYY-MM-DD) (*)', 
      'Catatan / Keterangan'
    ];
    ws.addRow(headers);

    // Add Description Row (Row 2)
    const descriptionRow = [
      'Jangan diubah', 'Referensi', 'Referensi', 'Pilih dari Dropdown',
      'Pilih dari Dropdown', 'Format: YYYY-MM-DD', 'Opsional'
    ];
    ws.addRow(descriptionRow);

    // Add Example Row (Row 3)
    const exampleRow = [
      'ID_AKUN', 
      'NIK001', 
      'Contoh Nama', 
      'Sehat', 
      'Tidak ada risiko kerja', 
      new Date().toISOString().split('T')[0], 
      'Contoh pengisian data kesehatan'
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
      // Dropdown for Status Medis
      const statusCell = ws.getCell(`D${i}`);
      statusCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Sehat,Fit dengan Catatan,Unfit,Menunggu Hasil"']
      };

      // Dropdown for Risiko Kesehatan
      const riskCell = ws.getCell(`E${i}`);
      riskCell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Tidak ada risiko kerja,Risiko Rendah,Risiko Sedang,Risiko Tinggi,Risiko Sangat Tinggi"']
      };

      // Date validation
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
      col.width = [20, 15, 25, 25, 25, 25, 30][idx];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const dataBlob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(dataBlob, `HUREMA_Health_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
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
            .slice(2) // Skip instruction rows
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
              const internalNik = String(row['NIK Internal'] || '').trim();
              const fullName = String(row['Nama Karyawan'] || '').trim();
              const changeDate = formatExcelDate(row['Tanggal Pemeriksaan (YYYY-MM-DD) (*)']);

              // Smart matching logic for files
              let matchedFileId = null;
              let matchedFilename = null;
              if (internalNik || fullName) {
                const normalizedNik = (internalNik || '').toLowerCase();
                const normalizedName = (fullName || '').toLowerCase();
                Object.entries(bulkFiles).forEach(([fileName, fileId]) => {
                  const normalizedFileName = fileName.toLowerCase();
                  if (
                    (normalizedNik && normalizedFileName.includes(normalizedNik)) || 
                    (normalizedName && normalizedFileName.includes(normalizedName))
                  ) {
                    matchedFileId = fileId;
                    matchedFilename = fileName;
                  }
                });
              }

              const requiredFields = [
                'Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 
                'Status Medis (*)', 'Risiko Kesehatan (*)',
                'Tanggal Pemeriksaan (YYYY-MM-DD) (*)'
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
              } else {
                // Value validation for Status Medis
                const statusMedis = String(row['Status Medis (*)'] || '').trim();
                const validStatus = ["Sehat", "Fit dengan Catatan", "Unfit", "Menunggu Hasil"];
                if (!validStatus.includes(statusMedis)) {
                  errorMsg = `Status Medis '${statusMedis}' tidak valid. Pilih dari dropdown.`;
                }

                // Value validation for Risiko Kesehatan
                if (!errorMsg) {
                  const risikoKesehatan = String(row['Risiko Kesehatan (*)'] || '').trim();
                  const validRisk = ["Tidak ada risiko kerja", "Risiko Rendah", "Risiko Sedang", "Risiko Tinggi", "Risiko Sangat Tinggi"];
                  if (!validRisk.includes(risikoKesehatan)) {
                    errorMsg = `Risiko Kesehatan '${risikoKesehatan}' tidak valid. Pilih dari dropdown.`;
                  }
                }
              }

              const isValid = !errorMsg;

              return {
                account_id: accountId,
                full_name: fullName,
                internal_nik: internalNik,
                mcu_status: row['Status Medis (*)'],
                health_risk: row['Risiko Kesehatan (*)'],
                change_date: changeDate,
                notes: row['Catatan / Keterangan'] || null,
                file_mcu_id: matchedFileId,
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

  async commitImport(data: any[]) {
    const validData = data.filter(d => d.isValid);
    for (const item of validData) {
      await accountService.createHealthLog({
        account_id: item.account_id,
        mcu_status: item.mcu_status,
        health_risk: item.health_risk,
        diagnosis: item.diagnosis,
        notes: item.notes,
        change_date: item.change_date,
        file_mcu_id: item.file_mcu_id || null
      });
    }
  },

  async update(id: string, input: any) {
    return accountService.updateHealthLog(id, input);
  },

  async delete(id: string) {
    return accountService.deleteHealthLog(id);
  },

  async bulkDelete(ids: string[]) {
    for (const id of ids) {
      await this.delete(id);
    }
    return true;
  }
};
