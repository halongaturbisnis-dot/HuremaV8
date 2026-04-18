
/**
 * mobilePopUpSizeGuide
 * 
 * Objek helper ini berfungsi sebagai panduan standar ukuran pop-up modal 
 * khusus untuk pengguna mobile. Mengacu pada standar desain 'PresenceDetailMobile'.
 * 
 * Komposisi:
 * - Rounded: 24px (Modern & Smooth)
 * - Max Height: 90vh (Fit to screen safely)
 * - Overlay: Backdrop blur with dark tint
 * - Animation: Zoom-in transition
 */

export const mobilePopUpSizeGuide = {
  // Class untuk overlay latar belakang (backdrop)
  overlay: "fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4",
  
  // Class untuk container utama modal
  container: "bg-white rounded-[24px] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in duration-300"
};
