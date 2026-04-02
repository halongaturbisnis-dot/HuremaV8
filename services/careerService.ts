import { supabase } from '../lib/supabase';
import { CareerLogExtended } from '../types';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { accountService } from './accountService';
import { locationService } from './locationService';
import { scheduleService } from './scheduleService';

export const careerService = {
  async getAllGlobal(page: number = 1, limit: number = 25, searchQuery: string = '') {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from('account_career_logs')
      .select(`
        *,
        account:accounts!inner(full_name, internal_nik, role, access_code, photo_google_id)
      `, { count: 'exact' })
      .not('account.access_code', 'ilike', '%SPADMIN%');

    if (searchQuery) {
      const accountIds = await accountService.searchIds(searchQuery);
      if (accountIds.length > 0) {
        query = query.or(`position.ilike.%${searchQuery}%,grade.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%,account_id.in.(${accountIds.join(',')})`);
      } else {
        query = query.or(`position.ilike.%${searchQuery}%,grade.ilike.%${searchQuery}%,location_name.ilike.%${searchQuery}%`);
      }
    }

    const { data, error, count } = await query
      .order('change_date', { ascending: false })
      .range(from, to);
    
    if (error) throw error;
    return { data: data as CareerLogExtended[], count: count || 0 };
  },

  async downloadTemplate() {
    const accounts = await accountService.getAll();
    const locations = await locationService.getAll();
    const allSchedules = await scheduleService.getAll();

    const workbook = new ExcelJS.Workbook();
    const wsImport = workbook.addWorksheet('Career_Import');
    const wsData = workbook.addWorksheet('Data_Reference');
    wsData.state = 'hidden';

    // Add locations to reference sheet
    wsData.getCell('A1').value = 'Locations';
    locations.forEach((loc, idx) => {
      wsData.getCell(`A${idx + 2}`).value = loc.name;
    });

    // Add schedules to reference sheet
    wsData.getCell('B1').value = 'Schedules';
    const filteredSchedules = allSchedules.filter(s => s.type === 1 || s.type === 2);
    const uniqueSchedules = Array.from(new Set(filteredSchedules.map(s => s.name)));
    uniqueSchedules.push('Fleksibel');
    uniqueSchedules.push('Shift Dinamis');
    uniqueSchedules.forEach((sch, idx) => {
      wsData.getCell(`B${idx + 2}`).value = sch;
    });

    const headers = [
      'Account ID (Hidden)', 
      'NIK Internal', 
      'Nama Karyawan', 
      'Nomor SK (*)',
      'Jabatan Baru (*)', 
      'Departemen Baru (*)', 
      'Nama Lokasi (*)', 
      'Nama Jadwal (*)', 
      'Tanggal Perubahan (YYYY-MM-DD) (*)', 
      'Catatan / Keterangan'
    ];
    wsImport.addRow(headers);

    // Add Description Row (Row 2)
    const descriptionRow = [
      'Jangan diubah', 'Referensi', 'Referensi', 'Wajib diisi',
      'Wajib diisi', 'Wajib diisi', 'Pilih dari daftar', 'Pilih dari daftar',
      'Format: YYYY-MM-DD', 'Opsional'
    ];
    wsImport.addRow(descriptionRow);

    // Add Example Row (Row 3)
    const exampleRow = [
      'ID_AKUN', 
      'NIK001', 
      'Contoh Nama', 
      'SK/2024/001',
      'Senior Staff', 
      'Operasional', 
      locations[0]?.name || 'Pusat', 
      'Fleksibel', 
      new Date().toISOString().split('T')[0], 
      'Promosi Jabatan'
    ];
    wsImport.addRow(exampleRow);

    // Add All Accounts (Row 4 onwards)
    accounts
      .filter(acc => !acc.end_date || new Date(acc.end_date) > new Date())
      .forEach(acc => {
        wsImport.addRow([acc.id, acc.internal_nik, acc.full_name, '', '', '', '', '', '', '']);
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

    // Apply Data Validations (Dropdowns)
    const totalRows = 3 + accounts.length;
    for (let i = 4; i <= totalRows; i++) {
      // Location Dropdown (Column G)
      const cellG = wsImport.getCell(`G${i}`);
      cellG.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Data_Reference!$A$2:$A$${locations.length + 1}`]
      };

      // Schedule Dropdown (Column H)
      const cellH = wsImport.getCell(`H${i}`);
      cellH.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`Data_Reference!$B$2:$B$${uniqueSchedules.length + 1}`]
      };
    }

    wsImport.columns.forEach((col, idx) => {
      col.width = [20, 15, 25, 30, 20, 20, 25, 25, 22, 25][idx];
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `HUREMA_Career_Template_${new Date().toISOString().split('T')[0]}.xlsx`);
  },

  async processImport(file: File, bulkFiles: Record<string, string> = {}) {
    const locations = await locationService.getAll();
    const allSchedules = await scheduleService.getAll();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

          const results = jsonData
            .slice(2) // Skip "Referensi" and "Contoh" rows
            .filter((row: any) => {
              return Object.values(row).some(val => val !== null && val !== undefined && String(val).trim() !== '');
            })
            .map((row: any) => {
              const getVal = (key: string) => String(row[key] || '').trim();
              
              const forceString = (val: any) => {
                if (val === undefined || val === null) return '';
                if (typeof val === 'number') return val.toLocaleString('fullwide', { useGrouping: false });
                return String(val).trim();
              };

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

              const skNumber = forceString(row['Nomor SK (*)']);
              const accountId = forceString(row['Account ID (Hidden)']);
              const fullName = forceString(row['Nama Karyawan']);
              const internalNik = forceString(row['NIK Internal']);

              let matchedFileId = null;
              if (skNumber) {
                const normalizedNo = skNumber.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                Object.entries(bulkFiles).forEach(([fileName, fileId]) => {
                  const normalizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                  if (normalizedFileName === normalizedNo) matchedFileId = fileId;
                });
              }

              // Resolve Location ID
              const locationName = getVal('Nama Lokasi (*)');
              const location = locations.find(l => l.name.trim().toLowerCase() === locationName.trim().toLowerCase());
              const locationId = location?.id || null;

              // Resolve Schedule ID & Type
              const scheduleName = getVal('Nama Jadwal (*)');
              let scheduleId = null;
              let scheduleType = '';
              let scheduleError = '';

              if (scheduleName.toLowerCase() === 'fleksibel') {
                scheduleType = 'Fleksibel';
              } else if (scheduleName.toLowerCase() === 'shift dinamis') {
                // Shift Dinamis is valid ONLY if the location has at least one schedule with type === 2 (Shift Kerja)
                const hasShiftSchedules = locationId && allSchedules.some(s => 
                  s.type === 2 && 
                  s.location_ids && 
                  s.location_ids.includes(locationId)
                );
                
                if (hasShiftSchedules) {
                  scheduleType = 'Shift Dinamis';
                } else {
                  scheduleError = `Lokasi '${locationName}' tidak mendukung sistem Shift Dinamis (Tidak ada Master Jadwal Shift Kerja).`;
                }
              } else if (scheduleName) {
                const sch = allSchedules.find(s => s.name.trim().toLowerCase() === scheduleName.trim().toLowerCase());
                if (sch) {
                  // Check if schedule belongs to the location
                  if (locationId && sch.location_ids && sch.location_ids.length > 0 && !sch.location_ids.includes(locationId)) {
                    scheduleError = `Jadwal '${scheduleName}' tidak valid untuk lokasi '${locationName}'.`;
                  } else {
                    scheduleId = sch.id;
                    scheduleType = sch.name;
                  }
                } else {
                  scheduleError = `Jadwal '${scheduleName}' tidak ditemukan dalam master data.`;
                }
              }

              const requiredFields = [
                'Account ID (Hidden)', 'NIK Internal', 'Nama Karyawan', 
                'Nomor SK (*)', 'Jabatan Baru (*)', 
                'Departemen Baru (*)', 'Nama Lokasi (*)', 'Nama Jadwal (*)', 
                'Tanggal Perubahan (YYYY-MM-DD) (*)'
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
              } else if (!locationId) {
                errorMsg = `Lokasi '${locationName}' tidak ditemukan.`;
              } else if (scheduleError) {
                errorMsg = scheduleError;
              } else if (!scheduleType) {
                errorMsg = `Jadwal '${scheduleName}' tidak ditemukan.`;
              }

              const isValid = !errorMsg;

              return {
                account_id: accountId,
                full_name: fullName,
                internal_nik: internalNik,
                sk_number: skNumber,
                position: row['Jabatan Baru (*)'],
                grade: row['Departemen Baru (*)'],
                location_id: locationId,
                location_name: locationName,
                schedule_id: scheduleId,
                schedule_type: scheduleType,
                change_date: formatExcelDate(row['Tanggal Perubahan (YYYY-MM-DD) (*)']),
                notes: row['Catatan / Keterangan'] || row['Keterangan'] || null,
                file_sk_id: matchedFileId,
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
      await accountService.createCareerLog({
        account_id: item.account_id,
        position: item.position,
        grade: item.grade,
        location_id: item.location_id,
        location_name: item.location_name,
        schedule_id: item.schedule_id,
        schedule_type: item.schedule_type,
        notes: item.notes,
        change_date: item.change_date,
        file_sk_id: item.file_sk_id || null
      });
    }
  },

  async delete(id: string) {
    return accountService.deleteCareerLog(id);
  },

  async bulkDelete(ids: string[]) {
    for (const id of ids) {
      await this.delete(id);
    }
    return true;
  }
};
