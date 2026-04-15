
export const formatDateID = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
};

export const formatFullDateID = (date: string | Date | undefined | null): string => {
  if (!date) return '-';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '-';

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  return `${day} ${month} ${year}`;
};
