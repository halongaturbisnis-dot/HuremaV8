
import Swal from 'sweetalert2';

/**
 * validateMaxUploadSize
 * 
 * Fungsi helper untuk memvalidasi ukuran file unggahan.
 * Maksimal ukuran file: 2MB (2 * 1024 * 1024 bytes).
 * Menampilkan pesan peringatan dalam Bahasa Indonesia jika melebihi batas.
 */
export const validateMaxUploadSize = (file: File): boolean => {
  const MAX_SIZE_MB = 2;
  const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;

  if (file.size > MAX_SIZE_BYTES) {
    Swal.fire({
      title: 'File Terlalu Besar',
      text: `Maksimal ukuran file adalah ${MAX_SIZE_MB}MB. Silakan pilih file yang lebih kecil.`,
      icon: 'warning',
      confirmButtonColor: '#006E62'
    });
    return false;
  }

  return true;
};
