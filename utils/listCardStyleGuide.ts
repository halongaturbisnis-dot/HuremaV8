
/**
 * listCardStyleGuide
 * 
 * Panduan styling untuk komponen kartu dalam bentuk list (List Card).
 * Memberikan kesan horizontal, modern, dan interaktif.
 */
export const listCardStyleGuide = {
  // Container utama: Full width, sangat melingkar, border halus, & efek tekan
  container: "w-full bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between group active:scale-[0.98] transition-all",
  
  // Area konten kiri (Judul & Sub-info)
  contentWrapper: "flex flex-col gap-1 min-w-0 flex-1",
  
  // Teks Baris Utama (Tanggal / Nama)
  title: "text-sm font-black text-gray-800 tracking-tight leading-tight",
  
  // Teks Baris Kedua (Jam / Keterangan / Deskripsi)
  subtitle: "text-[11px] text-gray-400 font-bold uppercase tracking-widest truncate",
  
  // Area kanan (Status & Icons)
  rightWrapper: "flex items-center gap-3 shrink-0",
  
  // Badge Status (Base)
  statusBadge: "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 w-fit",
  
  // Area Tombol Aksi (Hapus/Reload)
  actionGroup: "flex items-center gap-2",
  
  // Tombol Aksi Kecil
  actionButton: "w-10 h-10 rounded-xl flex items-center justify-center active:scale-90 transition-all shadow-sm border"
};
