
import React, { useState } from 'react';
import { X, FileUp, Download, CheckCircle, AlertTriangle, Save, Loader2, Paperclip, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { certificationService } from '../../services/certificationService';
import { googleDriveService } from '../../services/googleDriveService';

interface CertificationImportModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CertificationImportModal: React.FC<CertificationImportModalProps> = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<Record<string, string>>({});
  const [fileList, setFileList] = useState<{ name: string; id: string }[]>([]);

  const handleBulkFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Mitigation: Check for duplicate filenames in the current batch and existing list
    const currentBatchNames = (Array.from(files) as File[]).map(f => f.name.split('.').slice(0, -1).join('.'));
    const existingNames = fileList.map(f => f.name);
    
    const duplicatesInBatch = currentBatchNames.filter((name, index) => currentBatchNames.indexOf(name) !== index);
    const alreadyExists = currentBatchNames.filter(name => existingNames.includes(name));

    if (duplicatesInBatch.length > 0 || alreadyExists.length > 0) {
      const errorMsg = duplicatesInBatch.length > 0 
        ? `Ditemukan nama file yang sama dalam batch ini: [${duplicatesInBatch.join(', ')}].`
        : `Beberapa file sudah pernah diunggah sebelumnya: [${alreadyExists.join(', ')}].`;
        
      Swal.fire({
        title: 'File Duplikat',
        text: `${errorMsg} Harap pastikan setiap file memiliki nama yang unik agar sistem tidak bingung saat mapping.`,
        icon: 'error'
      });
      if (e.target) e.target.value = '';
      return;
    }

    try {
      setIsUploadingAttachments(true);
      const newFiles: { name: string; id: string }[] = [];
      
      const uploadPromises = Array.from(files).map(async (f) => {
        const file = f as File;
        const fileId = await googleDriveService.uploadFile(file);
        const fileName = file.name.split('.').slice(0, -1).join('.');
        newFiles.push({ name: fileName, id: fileId });
      });

      await Promise.all(uploadPromises);
      
      const updatedFileList = [...fileList, ...newFiles];
      setFileList(updatedFileList);
      
      const mapping: Record<string, string> = {};
      updatedFileList.forEach(f => mapping[f.name] = f.id);
      setBulkFiles(mapping);

      // Update preview data with new attachments
      setPreviewData(prev => prev.map(row => {
        const certName = row.cert_name || '';
        const fullName = row.full_name || '';
        if (!certName || !fullName) return row;
        
        const normalizedCert = String(certName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const normalizedName = String(fullName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        const matches = updatedFileList.filter(f => {
          const normalizedFileName = f.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          // Match if filename contains both name and cert
          return normalizedFileName.includes(normalizedCert) && normalizedFileName.includes(normalizedName);
        });

        return {
          ...row,
          file_id: matches.length > 0 ? matches[0].id : row.file_id,
          matched_filename: matches.length > 0 ? matches[0].name : row.matched_filename,
          hasConflict: matches.length > 1
        };
      }));
      
      Swal.fire({
        title: 'Berhasil!',
        text: `${files.length} lampiran berhasil ditambahkan.`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire('Gagal', 'Gagal mengunggah beberapa lampiran.', 'error');
    } finally {
      setIsUploadingAttachments(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteFile = (fileName: string) => {
    const updatedFileList = fileList.filter(f => f.name !== fileName);
    setFileList(updatedFileList);
    
    const mapping: Record<string, string> = {};
    updatedFileList.forEach(f => mapping[f.name] = f.id);
    setBulkFiles(mapping);

    // Update preview data
    setPreviewData(prev => prev.map(row => {
      const certName = row.cert_name || '';
      const fullName = row.full_name || '';
      if (!certName || !fullName) return row;
      
      const normalizedCert = String(certName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      const normalizedName = String(fullName).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      
      const matches = updatedFileList.filter(f => {
        const normalizedFileName = f.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        return normalizedFileName.includes(normalizedCert) && normalizedFileName.includes(normalizedName);
      });

      return {
        ...row,
        file_id: matches.length > 0 ? matches[0].id : null,
        matched_filename: matches.length > 0 ? matches[0].name : null,
        hasConflict: matches.length > 1
      };
    }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const results = await certificationService.processImport(file) as any[];
      setPreviewData(results);
    } catch (error) {
      Swal.fire('Gagal', 'Format file tidak didukung atau data tidak valid.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCommit = async () => {
    const hasError = previewData.some(d => !d.isValid);
    if (hasError) {
      Swal.fire('Peringatan', 'Masih ada data yang error. Silakan perbaiki file Excel Anda terlebih dahulu.', 'warning');
      return;
    }

    const validCount = previewData.length;
    if (validCount === 0) {
      Swal.fire('Peringatan', 'Tidak ada data untuk diimpor.', 'warning');
      return;
    }

    const confirm = await Swal.fire({
      title: 'Konfirmasi Impor',
      text: `Sistem akan memproses ${validCount} data sertifikasi. Lanjutkan?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#006E62',
      confirmButtonText: 'Ya, Proses Sekarang'
    });

    if (confirm.isConfirmed) {
      try {
        setIsUploading(true);
        await certificationService.commitImport(previewData);
        Swal.fire('Berhasil!', 'Seluruh data sertifikasi telah diimpor.', 'success');
        onSuccess();
      } catch (error) {
        Swal.fire('Gagal', 'Terjadi kesalahan saat memproses data.', 'error');
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
      <div className="bg-white rounded-md shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#006E62]">Impor Massal Sertifikasi</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Tahap {step}: {step === 1 ? 'Unggah Data Sertifikasi' : 'Unggah Lampiran Sertifikat'}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center py-6 border-b border-gray-50">
                <div className="w-16 h-16 bg-emerald-50 text-[#006E62] rounded-full flex items-center justify-center mb-4">
                  <FileUp size={32} />
                </div>
                <div className="text-center max-w-md">
                  <h4 className="text-lg font-bold text-gray-800">Unggah Data Sertifikasi</h4>
                </div>

                <div className="flex items-center gap-3 mt-6 w-full max-w-md">
                  <button 
                    onClick={() => certificationService.downloadTemplate()}
                    className="flex-1 flex items-center justify-center gap-2 border border-gray-200 px-4 py-3 rounded-md hover:bg-gray-50 transition-colors text-sm font-bold text-gray-600 uppercase tracking-tighter"
                  >
                    <Download size={18} /> Download Template
                  </button>
                  
                  <label className="flex-1 flex items-center justify-center gap-2 bg-[#006E62] text-white px-4 py-3 rounded-md hover:bg-[#005a50] transition-colors shadow-md text-sm font-bold uppercase tracking-tighter cursor-pointer">
                    {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />}
                    {isProcessing ? 'Memproses...' : previewData.length > 0 ? 'Ganti File' : 'Unggah File'}
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".xlsx" 
                      onChange={handleFileChange} 
                      onClick={(e) => (e.target as HTMLInputElement).value = ''}
                      disabled={isProcessing} 
                    />
                  </label>
                </div>
              </div>

              {previewData.length > 0 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-md border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle size={20} />
                      <p className="text-xs font-bold">Terbaca {previewData.length} baris. ({previewData.filter(d => d.isValid).length} Valid, <span className={previewData.some(d => !d.isValid) ? 'text-red-600' : ''}>{previewData.filter(d => !d.isValid).length} Error</span>)</p>
                    </div>
                  </div>

                  <div className="border border-gray-100 rounded overflow-x-auto">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Nama Karyawan</th>
                          <th className="px-4 py-2">Jenis</th>
                          <th className="px-4 py-2">Nama Sertifikasi</th>
                          <th className="px-4 py-2">Tanggal</th>
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
                                <div className="flex items-center gap-1 text-red-600 font-bold">
                                  <AlertTriangle size={14} />
                                  <span>{row.errorMsg}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2 font-bold">{row.full_name}</td>
                            <td className="px-4 py-2">{row.cert_type}</td>
                            <td className="px-4 py-2 font-bold text-[#006E62]">{row.cert_name}</td>
                            <td className="px-4 py-2">{row.cert_date}</td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                {row.notes && <span className="text-gray-600">{row.notes}</span>}
                                {!row.isValid && (
                                  <span className="text-red-600 font-medium">
                                    {row.errorMsg || 'Data wajib belum lengkap'}
                                  </span>
                                )}
                              </div>
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
                <div className="w-16 h-16 bg-emerald-50 text-[#006E62] rounded-full flex items-center justify-center mb-4">
                  <Paperclip size={32} />
                </div>
                <div className="text-center max-w-md">
                  <h4 className="text-lg font-bold text-gray-800">2. Unggah Lampiran Sertifikat (Opsional)</h4>
                  <p className="text-xs text-gray-500 mt-2">Unggah file Sertifikat. Sistem akan mencocokkan nama file dengan Nama Karyawan & Nama Sertifikasi secara otomatis.</p>
                </div>

                <div className="mt-6 w-full max-w-md">
                  <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 px-4 py-6 rounded-md hover:bg-gray-50 hover:border-[#006E62] transition-all text-sm font-bold text-gray-400 uppercase tracking-tighter cursor-pointer">
                    {isUploadingAttachments ? <Loader2 size={24} className="animate-spin text-[#006E62]" /> : <Upload size={24} />}
                    {isUploadingAttachments ? 'Sedang Mengunggah...' : 'Klik atau Seret File Sertifikat ke Sini'}
                    <input type="file" className="hidden" accept="image/*,application/pdf" multiple onChange={handleBulkFileUpload} disabled={isUploadingAttachments} />
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
                            <Paperclip size={12} className="text-[#006E62] shrink-0" />
                            <span className="text-[10px] font-medium text-gray-600 truncate">{file.name}</span>
                          </div>
                          <button 
                            onClick={() => handleDeleteFile(file.name)}
                            className="text-red-400 hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="md:col-span-2 space-y-3">
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Pencocokan Lampiran</h5>
                  <div className="border border-gray-100 rounded overflow-hidden">
                    <table className="w-full text-left text-[10px]">
                      <thead className="bg-gray-50 font-bold text-gray-500 uppercase">
                        <tr>
                          <th className="px-3 py-2">Nama Karyawan</th>
                          <th className="px-3 py-2">Sertifikasi</th>
                          <th className="px-3 py-2 text-center">Status Lampiran</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {previewData.map((row, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-medium">{row.full_name}</td>
                            <td className="px-3 py-2">{row.cert_name}</td>
                            <td className="px-3 py-2 text-center">
                              {row.file_id ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <div className="flex items-center gap-1 justify-center">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    {row.hasConflict && <AlertTriangle size={12} className="text-amber-500" title="Ditemukan lebih dari satu file yang cocok" />}
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
              className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-2 rounded shadow-md hover:bg-[#005a50] transition-all text-xs font-bold uppercase disabled:opacity-50"
            >
              Lanjut
            </button>
          ) : (
            <div className="flex gap-3">
              <button 
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-bold text-[#006E62] uppercase border border-[#006E62] rounded"
              >
                Kembali
              </button>
              <button 
                onClick={handleCommit}
                disabled={isUploading || previewData.some(d => !d.isValid)}
                className="flex items-center gap-2 bg-[#006E62] text-white px-8 py-2 rounded shadow-md hover:bg-[#005a50] transition-all text-xs font-bold uppercase disabled:opacity-50"
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

export default CertificationImportModal;
