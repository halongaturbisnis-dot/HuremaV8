import React, { useState } from 'react';
import { X, FileUp, Download, CheckCircle, AlertTriangle, Save, Loader2, Paperclip, Info, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { disciplineService } from '../../services/disciplineService';
import { googleDriveService } from '../../services/googleDriveService';

interface DisciplineImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
  type?: 'warning' | 'termination';
}

const DisciplineImportModal: React.FC<DisciplineImportModalProps> = ({ onClose, onSuccess, type = 'warning' }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [fileList, setFileList] = useState<{ name: string; id: string }[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      
      // Convert fileList to Record<string, string> for service
      const bulkFiles: Record<string, string> = {};
      fileList.forEach(f => { bulkFiles[f.name] = f.id; });

      const results = type === 'warning' 
        ? await disciplineService.processWarningImport(file, bulkFiles) as any[]
        : await disciplineService.processTerminationImport(file, bulkFiles) as any[];
      setPreviewData(results);
    } catch (error) {
      Swal.fire('Gagal', 'Format file tidak didukung atau kolom tidak sesuai.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setIsUploadingAttachments(true);
      const newFiles: { name: string; id: string }[] = [];
      
      const filesArray = Array.from(files) as File[];
      for (const file of filesArray) {
        // Check for duplicates in current fileList or current batch
        const isDuplicate = fileList.some(f => f.name === file.name) || 
                          newFiles.some(f => f.name === file.name);
        
        if (isDuplicate) {
          console.warn(`File skip: ${file.name} sudah ada.`);
          continue;
        }

        const fileId = await googleDriveService.uploadFile(file);
        newFiles.push({ name: file.name, id: fileId });
      }
      
      const updatedFileList = [...fileList, ...newFiles];
      setFileList(updatedFileList);
      
      // Update preview data with new attachments based on Employee Name mapping
      setPreviewData(prev => prev.map(row => {
        if (row.file_id) return row; // Skip if already matched

        const fullName = row.full_name || '';
        if (!fullName) return row;
        
        const normalizedName = fullName.toLowerCase();
        
        const matches = updatedFileList.filter(f => {
          const normalizedFileName = f.name.toLowerCase();
          return normalizedFileName.includes(normalizedName);
        });

        return {
          ...row,
          file_id: matches.length > 0 ? matches[0].id : row.file_id,
          matched_filename: matches.length > 0 ? matches[0].name : row.matched_filename,
          hasConflict: matches.length > 1
        };
      }));
      
      if (newFiles.length > 0) {
        Swal.fire({
          title: 'Berhasil!',
          text: `${newFiles.length} dokumen berhasil ditambahkan.`,
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Info', 'Tidak ada file baru yang diunggah (semua file duplikat).', 'info');
      }
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah beberapa dokumen.', 'error');
    } finally {
      setIsUploadingAttachments(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteFile = (fileName: string) => {
    const updatedFileList = fileList.filter(f => f.name !== fileName);
    setFileList(updatedFileList);
    
    setPreviewData(prev => prev.map(row => {
      const fullName = row.full_name || '';
      if (!fullName) return row;
      
      const normalizedName = fullName.toLowerCase();
      
      const matches = updatedFileList.filter(f => {
        const normalizedFileName = f.name.toLowerCase();
        return normalizedFileName.includes(normalizedName);
      });

      return {
        ...row,
        file_id: matches.length > 0 ? matches[0].id : null,
        matched_filename: matches.length > 0 ? matches[0].name : null,
        hasConflict: matches.length > 1
      };
    }));
  };

  const handleCommit = async () => {
    const validData = previewData.filter(d => d.isValid);
    if (validData.length === 0) return Swal.fire('Peringatan', 'Tidak ada data valid untuk diimpor.', 'warning');

    const confirm = await Swal.fire({
      title: 'Konfirmasi Impor',
      text: `Sistem akan memproses ${validData.length} baris data ${type === 'warning' ? 'peringatan' : 'pemberhentian'}. Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: type === 'warning' ? '#006E62' : '#dc2626',
      confirmButtonText: 'Ya, Proses Sekarang'
    });

    if (confirm.isConfirmed) {
      try {
        setIsUploading(true);
        if (type === 'warning') {
          await disciplineService.commitWarningImport(previewData);
        } else {
          await disciplineService.commitTerminationImport(previewData);
        }

        Swal.fire('Berhasil!', `Seluruh data ${type === 'warning' ? 'Peringatan' : 'Exit'} telah diperbarui.`, 'success');
        onSuccess();
      } catch (error) {
        console.error('Import error:', error);
        Swal.fire('Gagal', 'Terjadi kesalahan saat memproses data.', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const getTemplateDownloadAction = () => {
    if (type === 'warning') return disciplineService.downloadWarningTemplate();
    return disciplineService.downloadTerminationTemplate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className={`text-base font-bold ${type === 'warning' ? 'text-[#006E62]' : 'text-red-600'}`}>
              Impor Massal {type === 'warning' ? 'Data Peringatan' : 'Data Keluar (Exit)'}
            </h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tahap {step}: {step === 1 ? 'Unggah Data' : 'Unggah Lampiran'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6 border-b border-gray-50">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${type === 'warning' ? 'bg-emerald-50 text-[#006E62]' : 'bg-red-50 text-red-600'}`}>
                  <FileUp size={32} />
                </div>
                <div className="text-center max-w-md">
                  <h4 className="text-lg font-bold text-gray-800">Unggah Data</h4>
                </div>
                <div className="flex items-center gap-3 mt-6 w-full max-w-md">
                  <button onClick={getTemplateDownloadAction} className="flex-1 flex items-center justify-center gap-2 border border-gray-200 px-4 py-3 rounded-md hover:bg-gray-50 text-sm font-bold text-gray-600 uppercase tracking-tighter">
                    <Download size={18} /> Download Template
                  </button>
                  <label className={`flex-1 flex items-center justify-center gap-2 text-white px-4 py-3 rounded-md transition-colors shadow-md text-sm font-bold uppercase tracking-tighter cursor-pointer ${type === 'warning' ? 'bg-[#006E62] hover:bg-[#005a50]' : 'bg-red-600 hover:bg-red-700'}`}>
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                    {isProcessing ? 'Memproses...' : previewData.length > 0 ? 'Ganti File' : 'Unggah File'}
                    <input type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} disabled={isProcessing} />
                  </label>
                </div>
              </div>

              {previewData.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className={`flex items-center justify-between p-4 rounded border text-xs font-bold ${type === 'warning' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <div className="flex items-center gap-2">
                      <CheckCircle size={20} /> Terbaca {previewData.length} baris. ({previewData.filter(d => d.isValid).length} Valid)
                    </div>
                  </div>
                  <div className="border border-gray-100 rounded overflow-x-auto text-[10px]">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Nama</th>
                          <th className="px-4 py-2">{type === 'warning' ? 'Tipe SP' : 'Tipe Exit'}</th>
                          <th className="px-4 py-2">Alasan</th>
                          <th className="px-4 py-2">{type === 'warning' ? 'Tgl SP' : 'Tgl Exit'}</th>
                          {type === 'termination' && (
                            <>
                              <th className="px-4 py-2">Pesangon</th>
                              <th className="px-4 py-2">Penalti</th>
                            </>
                          )}
                          <th className="px-4 py-2">Keterangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {previewData.map((row, idx) => (
                          <tr key={idx} className={row.isValid ? '' : 'bg-red-50'}>
                            <td className="px-4 py-2">
                              {row.isValid ? (
                                <CheckCircle size={14} className="text-emerald-500" />
                              ) : (
                                <AlertTriangle size={14} className="text-red-500" />
                              )}
                            </td>
                            <td className="px-4 py-2 font-bold">{row.full_name}</td>
                            <td className={`px-4 py-2 uppercase font-bold ${type === 'warning' ? 'text-orange-600' : 'text-red-600'}`}>
                              <div className="flex items-center gap-2">
                                {type === 'warning' ? row.warning_type : row.termination_type}
                                {row.mitigationApplied && (
                                  <div className="group relative">
                                    <Info size={12} className="text-blue-500 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[10px] rounded shadow-xl z-10">
                                      Sistem menyesuaikan nilai Pesangon/Penalti agar sesuai dengan tipe exit.
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 truncate max-w-xs">{row.reason}</td>
                            <td className="px-4 py-2">{type === 'warning' ? row.issue_date : row.termination_date}</td>
                            {type === 'termination' && (
                              <>
                                <td className="px-4 py-2">{row.severance_amount.toLocaleString('id-ID')}</td>
                                <td className="px-4 py-2">{row.penalty_amount.toLocaleString('id-ID')}</td>
                              </>
                            )}
                            <td className={`px-4 py-2 font-medium ${row.isValid ? 'text-emerald-600' : 'text-red-600'}`}>
                              {row.isValid ? 'Data Valid' : row.errorMsg}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6 border-b border-gray-50">
                <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-4">
                  <Paperclip size={32} />
                </div>
                <div className="text-center max-w-md">
                  <h4 className="text-lg font-bold text-gray-800">2. Dokumen (Opsional)</h4>
                  <p className="text-xs text-gray-500 mt-2">
                    Unggah file dan beri Nama file sesuai <b>Nama Karyawan</b> agar sistem dapat melakukan mapping otomatis.
                  </p>
                </div>
                <div className="mt-6 w-full max-w-md">
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 px-4 py-6 rounded-md hover:bg-gray-50 hover:border-gray-400 transition-all text-sm font-bold text-gray-400 uppercase tracking-tighter cursor-pointer">
                    {isUploadingAttachments ? <Loader2 size={24} className="animate-spin text-gray-400" /> : <Upload size={24} />}
                    {isUploadingAttachments ? 'Sedang Mengunggah...' : 'Klik atau Seret File Dokumen ke Sini'}
                    <input type="file" className="hidden" multiple accept="image/*,.pdf" onChange={handleBulkFileUpload} disabled={isUploadingAttachments} />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-3">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">File Terunggah ({fileList.length})</h5>
                  <div className="bg-gray-50 rounded-md border border-gray-100 p-2 max-h-[300px] overflow-y-auto space-y-1">
                    {fileList.length === 0 ? (
                      <p className="text-[10px] text-gray-400 text-center py-4 italic">Belum ada file</p>
                    ) : (
                      fileList.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-gray-100 group">
                          <div className="flex items-center gap-2 min-w-0">
                            <Paperclip size={12} className="text-gray-400 shrink-0" />
                            <span className="text-[10px] font-medium text-gray-600 truncate">{file.name}</span>
                          </div>
                          <button onClick={() => handleDeleteFile(file.name)} className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Pencocokan Dokumen</h5>
                  <div className="border border-gray-100 rounded overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="px-3 py-2">Nama Karyawan</th>
                          <th className="px-3 py-2">{type === 'warning' ? 'Tipe SP' : 'Tipe Exit'}</th>
                          <th className="px-3 py-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {previewData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium">{row.full_name}</td>
                            <td className="px-3 py-2 uppercase">{type === 'warning' ? row.warning_type : row.termination_type}</td>
                            <td className="px-3 py-2 text-center">
                              {row.file_id ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1 justify-center">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    {row.hasConflict && <AlertTriangle size={12} className="text-amber-500" title="Nama ganda terdeteksi" />}
                                  </div>
                                  <span className="text-[7px] text-gray-400 truncate max-w-[80px] block" title={row.matched_filename}>
                                    {row.matched_filename}
                                  </span>
                                </div>
                              ) : (
                                <X size={14} className="text-gray-300 mx-auto" />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase">Batal</button>
          {step === 1 ? (
            <button 
              onClick={() => setStep(2)}
              disabled={previewData.length === 0 || previewData.some(d => !d.isValid)}
              className={`flex items-center gap-2 text-white px-8 py-2 rounded shadow-md transition-all text-xs font-bold uppercase disabled:opacity-50 ${type === 'warning' ? 'bg-[#006E62] hover:bg-[#005a50]' : 'bg-red-600 hover:bg-red-700'}`}
            >
              Lanjut
            </button>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className={`px-4 py-2 text-xs font-bold uppercase border rounded ${type === 'warning' ? 'text-[#006E62] border-[#006E62]' : 'text-red-600 border-red-600'}`}
              >
                Kembali
              </button>
              <button 
                onClick={handleCommit} 
                disabled={isUploading} 
                className={`flex items-center gap-2 text-white px-8 py-2 rounded shadow-md transition-all text-xs font-bold uppercase disabled:opacity-50 ${type === 'warning' ? 'bg-[#006E62] hover:bg-[#005a50]' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                {isUploading ? 'Sedang Memproses...' : 'Simpan Seluruh Data'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

};

export default DisciplineImportModal;
