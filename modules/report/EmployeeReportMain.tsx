import React, { useState, useEffect } from 'react';
import { Users, UserPlus, UserMinus, RefreshCw } from 'lucide-react';
import { reportService } from '../../services/reportService';
import { EmployeeReportData } from '../../types';
import StatCard from './StatCard';
import { ChartContainer, SimpleBarChart, SimplePieChart } from './ChartComponents';
import Swal from 'sweetalert2';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const EmployeeReportMain: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<EmployeeReportData | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const reportData = await reportService.getEmployeeReportData();
      setData(reportData);
    } catch (error: any) {
      console.error('Error fetching report data:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal memuat data',
        text: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const showEmployeeModal = async (title: string, type: 'total' | 'new' | 'exit') => {
    const employees = await reportService.getEmployeesByType(type);
    
    const tableHtml = `
      <div class="overflow-x-auto max-h-[400px]">
        <table class="w-full text-sm text-left text-gray-500">
          <thead class="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th class="px-6 py-3">NIK</th>
              <th class="px-6 py-3">Nama</th>
              <th class="px-6 py-3">Jabatan</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(e => `
              <tr class="bg-white border-b">
                <td class="px-6 py-4">${e.internal_nik}</td>
                <td class="px-6 py-4">${e.full_name}</td>
                <td class="px-6 py-4">${e.position}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    Swal.fire({
      title: title,
      html: tableHtml,
      width: '800px',
      showCloseButton: true,
      showConfirmButton: true,
      confirmButtonText: 'Ekspor Excel',
      confirmButtonColor: '#006E62',
    }).then((result) => {
      if (result.isConfirmed) {
        exportToExcel(employees, title);
      }
    });
  };

  const exportToExcel = (employees: any[], title: string) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(title);
    worksheet.columns = [
      { header: 'NIK', key: 'internal_nik', width: 20 },
      { header: 'Nama', key: 'full_name', width: 30 },
      { header: 'Jabatan', key: 'position', width: 20 },
    ];
    worksheet.addRows(employees);
    workbook.xlsx.writeBuffer().then(buffer => {
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `${title}.xlsx`);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin text-[#006E62]" size={40} />
          <p className="text-gray-500 font-medium">Memproses data laporan...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Laporan Informasi Karyawan</h2>
          <p className="text-gray-500">Ringkasan infografis dan statistik sumber daya manusia</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Karyawan" 
          value={data.totalEmployees} 
          icon={Users} 
          color="bg-blue-500" 
          description="Karyawan aktif saat ini"
          onClick={() => showEmployeeModal('Total Karyawan', 'total')}
        />
        <StatCard 
          title="Karyawan Baru" 
          value={data.newEmployees} 
          icon={UserPlus} 
          color="bg-emerald-500" 
          description="Bergabung dalam 30 hari terakhir"
          onClick={() => showEmployeeModal('Karyawan Baru', 'new')}
        />
        <StatCard 
          title="Karyawan Exit" 
          value={data.exitEmployees} 
          icon={UserMinus} 
          color="bg-rose-500" 
          description="Keluar dalam 30 hari terakhir"
          onClick={() => showEmployeeModal('Karyawan Exit', 'exit')}
        />
      </div>

      {/* Charts Grid - Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Rasio Gender">
          <SimplePieChart data={data.genderRatio} />
        </ChartContainer>
        <ChartContainer title="Sebaran Usia">
          <SimpleBarChart data={data.ageDistribution} />
        </ChartContainer>
      </div>

      {/* Charts Grid - Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Sebaran Lokasi Kerja">
          <SimpleBarChart data={data.locationDistribution} />
        </ChartContainer>
        <ChartContainer title="Komposisi Jabatan">
          <SimpleBarChart data={data.positionDistribution} />
        </ChartContainer>
      </div>

      {/* Charts Grid - Employment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Tipe Kontrak Kerja">
          <SimplePieChart data={data.contractTypeDistribution} />
        </ChartContainer>
        <ChartContainer title="Masa Kerja (Tenure)">
          <SimpleBarChart data={data.tenureDistribution} />
        </ChartContainer>
      </div>

      {/* Charts Grid - Education & Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Tingkat Pendidikan">
          <SimplePieChart data={data.educationDistribution} />
        </ChartContainer>
        <ChartContainer title="Profil Risiko Kesehatan">
          <SimplePieChart data={data.healthRiskProfile} />
        </ChartContainer>
      </div>

      {/* New Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Sebaran Agama">
          <SimplePieChart data={data.religionDistribution} />
        </ChartContainer>
        <ChartContainer title="Sebaran Departemen">
          <SimpleBarChart data={data.departmentDistribution} />
        </ChartContainer>
      </div>
    </div>
  );
};

export default EmployeeReportMain;
