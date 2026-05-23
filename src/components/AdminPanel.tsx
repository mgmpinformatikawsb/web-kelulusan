/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Key, User, ShieldCheck, Eye, EyeOff, LayoutDashboard, 
  Settings, Users, Plus, Edit2, Trash2, Upload, Download, RefreshCw, 
  Lock, Save, LogOut, Check, X, FileSpreadsheet, Search, ChevronRight, 
  HelpCircle, AlertTriangle 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Siswa, AnnouncementSettings } from '../types';

interface AdminPanelProps {
  appSettings: AnnouncementSettings | null;
  onSettingsUpdate: (updated: AnnouncementSettings) => void;
  onLogoutTrigger: () => void;
  onLoginSuccess?: () => void;
}

interface StatsSummary {
  visitor_count: number;
  total_students: number;
  lulus_count: number;
  tidak_lulus_count: number;
}

export default function AdminPanel({ appSettings, onSettingsUpdate, onLogoutTrigger, onLoginSuccess }: AdminPanelProps) {
  const [token, setToken] = useState<string>(localStorage.getItem('admin_token') || '');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'siswa' | 'settings' | 'password'>('dashboard');

  // Stats
  const [stats, setStats] = useState<StatsSummary>({
    visitor_count: 0,
    total_students: 0,
    lulus_count: 0,
    tidak_lulus_count: 0
  });

  // Students list
  const [students, setStudents] = useState<Siswa[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [studentForm, setStudentForm] = useState<Partial<Siswa>>({
    nisn: '',
    nama: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    kelas: '',
    status_kelulusan: 'LULUS'
  });
  const [isEditingStudent, setIsEditingStudent] = useState<string | null>(null); // holds student ID if editing
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [siswaErrorMsg, setSiswaErrorMsg] = useState('');
  const [siswaSuccessMsg, setSiswaSuccessMsg] = useState('');

  // Settings form
  const [settingsForm, setSettingsForm] = useState<AnnouncementSettings>({
    announcement_time: '',
    school_name: '',
    academic_year: '',
    address: '',
    phone: '',
    email: ''
  });
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState('');
  const [settingsErrorMsg, setSettingsErrorMsg] = useState('');

  // Password change form
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  // Excel import/export refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [excelPreview, setExcelPreview] = useState<any[]>([]);
  const [excelError, setExcelError] = useState('');
  const [excelSuccess, setExcelSuccess] = useState('');

  // Verification of session token on boot
  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  // Load administration metrics
  useEffect(() => {
    if (token) {
      fetchStats();
      if (activeTab === 'siswa') {
        fetchStudents();
      }
    }
  }, [token, activeTab]);

  useEffect(() => {
    if (appSettings) {
      // populate settings form once app settings arrive
      // Format datetime-local requires YYYY-MM-DDTHH:MM
      let isoDate = appSettings.announcement_time || '';
      if (isoDate) {
        try {
          // Convert to local time format for picker (forced to WIB/Asia/Jakarta +07:00)
          const dateObj = new Date(isoDate);
          const tzOffset = -420 * 60000; // -420 minutes represents UTC+7 (WIB)
          const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
          isoDate = localISOTime;
        } catch(e) { /* fallback */ }
      }

      setSettingsForm({
        ...appSettings,
        announcement_time: isoDate
      });
    }
  }, [appSettings]);

  const verifyToken = async (activeToken: string) => {
    setIsVerifying(true);
    try {
      const resp = await fetch('/api/admin/verify-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: activeToken })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        handleLogout();
      }
    } catch (e) {
      // keep token on network issues
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!username.trim() || !password) {
      setLoginError('Sila isi semua ruangan.');
      return;
    }

    try {
      const resp = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setLoginError(data.message || 'Pemberitahuan masuk ditolak.');
      } else {
        localStorage.setItem('admin_token', data.token);
        setToken(data.token);
        setLoginError('');
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      }
    } catch (err) {
      setLoginError('Sambungan rangkaian gagal. Cuba sebentar lagi.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken('');
    onLogoutTrigger();
  };

  const fetchStats = async () => {
    try {
      const resp = await fetch('/api/admin/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success) {
        setStats(data.data.stats);
      }
    } catch (e) { /* silently skip on error */ }
  };

  const fetchStudents = async () => {
    try {
      const resp = await fetch('/api/admin/siswa', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success) {
        setStudents(data.data);
      }
    } catch (e) { /* silently skip */ }
  };

  // Student CRUD operations
  const handleStudentFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSiswaErrorMsg('');
    setSiswaSuccessMsg('');

    if (!studentForm.nisn || !studentForm.nama || !studentForm.tempat_lahir || !studentForm.tanggal_lahir || !studentForm.kelas) {
      setSiswaErrorMsg('Seluruh kolom data wajib diisi!');
      return;
    }

    const payload = { ...studentForm };
    const method = isEditingStudent ? 'PUT' : 'POST';
    const endpoint = isEditingStudent ? `/api/admin/siswa/${isEditingStudent}` : '/api/admin/siswa';

    try {
      const resp = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();

      if (!resp.ok || !data.success) {
        setSiswaErrorMsg(data.message || 'Gagal merekam data siswa.');
      } else {
        setSiswaSuccessMsg(isEditingStudent ? 'Informasi siswa diperbarui!' : 'Siswa berhasil didaftarkan!');
        setShowStudentForm(false);
        setStudentForm({
          nisn: '',
          nama: '',
          tempat_lahir: '',
          tanggal_lahir: '',
          kelas: '',
          status_kelulusan: 'LULUS'
        });
        setIsEditingStudent(null);
        fetchStudents();
        fetchStats();
      }
    } catch (err) {
      setSiswaErrorMsg('Koneksi bermasalah saat mengirim data.');
    }
  };

  const handleEditStudentClick = (s: Siswa) => {
    setStudentForm({
      nisn: s.nisn,
      nama: s.nama,
      tempat_lahir: s.tempat_lahir,
      tanggal_lahir: s.tanggal_lahir,
      kelas: s.kelas,
      status_kelulusan: s.status_kelulusan
    });
    setIsEditingStudent(s.id);
    setShowStudentForm(true);
    setSiswaErrorMsg('');
    setSiswaSuccessMsg('');
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus siswa "${name}"? Tindakan ini permanen.`);
    if (!confirmDelete) return;

    try {
      const resp = await fetch(`/api/admin/siswa/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (data.success) {
        setSiswaSuccessMsg('Siswa berhasil dihapus!');
        fetchStudents();
        fetchStats();
      } else {
        setSiswaErrorMsg(data.message);
      }
    } catch (e) {
      setSiswaErrorMsg('Koneksi terganggu.');
    }
  };

  // Settings Save
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSuccessMsg('');
    setSettingsErrorMsg('');

    // Format output date to clear ISO String, forcing WIB (+07:00) parsing
    let targetTime = settingsForm.announcement_time;
    if (targetTime) {
      try {
        const hasOffset = targetTime.includes('Z') || targetTime.includes('+') || (targetTime.lastIndexOf('-') > 7);
        const parseString = hasOffset ? targetTime : `${targetTime}+07:00`;
        targetTime = new Date(parseString).toISOString();
      } catch(e) { /* keep source on failure */ }
    }

    const payload = {
      ...settingsForm,
      announcement_time: targetTime
    };

    try {
      const resp = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setSettingsSuccessMsg('Pengaturan sekolah & rilis berhasil diperbarui!');
        onSettingsUpdate(data.data);
        fetchStats();
      } else {
        setSettingsErrorMsg(data.message || 'Gagal menyimpan pengaturan.');
      }
    } catch (err) {
      setSettingsErrorMsg('Koneksi terputus.');
    }
  };

  // Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess('');
    setPwdError('');

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPwdError('Seluruh kata sandi wajib diisi!');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError('Kata sandi konfirmasi tidak cocok!');
      return;
    }

    if (newPassword.length < 6) {
      setPwdError('Kata sandi baru minimal harus 6 karakter.');
      return;
    }

    try {
      const resp = await fetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ oldPassword, newPassword })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setPwdSuccess('Kata sandi admin berhasil diperbarui!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdError(data.message || 'Gagal mengubah kata sandi.');
      }
    } catch (err) {
      setPwdError('Koneksi bermasalah.');
    }
  };

  // EXCEL EXPORTER
  const handleExportExcel = () => {
    if (students.length === 0) {
      alert('Tidak ada data siswa untuk diexport.');
      return;
    }

    // Format spreadsheet layout gracefully
    const formattedData = students.map((s, idx) => ({
      'No': idx + 1,
      'NISN': s.nisn,
      'Nama Lengkap': s.nama,
      'Tempat Lahir': s.tempat_lahir,
      'Tanggal Lahir': s.tanggal_lahir,
      'Kelas': s.kelas,
      'Status Kelulusan': s.status_kelulusan
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Kelulusan Siswa');

    // Generate buffer & download
    XLSX.writeFile(workbook, `Data_Kelulusan_SMP_IX_${new Date().getFullYear()}.xlsx`);
  };

  // EXCEL IMPORTER
  const handleExcelImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExcelError('');
    setExcelSuccess('');
    setExcelPreview([]);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const rawData = evt.target?.result;
        const workbook = XLSX.read(rawData, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON row array
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonRows.length < 2) {
          setExcelError('Berkas Excel kosong atau baris judul tidak ditemukan.');
          return;
        }

        // Parse headers row to match keys safely (case insensitive match in Indonesian)
        const headers: string[] = jsonRows[0].map((h: any) => String(h || '').trim().toLowerCase());
        
        const colNISN = headers.findIndex(h => h.includes('nisn') || h.includes('nomor induk'));
        const colNama = headers.findIndex(h => h.includes('nama') || h.includes('siswa'));
        const colTempat = headers.findIndex(h => h.includes('tempat') || h.includes('lahir'));
        const colTanggal = headers.findIndex(h => h.includes('tanggal') || h.includes('tgl') || h.includes('lahir'));
        const colKelas = headers.findIndex(h => h.includes('kelas') || h.includes('rombel'));
        const colStatus = headers.findIndex(h => h.includes('status') || h.includes('lulus') || h.includes('keterangan'));

        if (colNISN === -1 || colNama === -1 || colTanggal === -1) {
          setExcelError('Header Excel tidak cocok! Pastikan ada kolom: NISN, Nama Lengkap, Tanggal Lahir (YYYY-MM-DD)');
          return;
        }

        const validParsedStudents: any[] = [];
        
        // Loop students rows (skipping header at index 0)
        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || row.length === 0) continue;

          let rawNISN = String(row[colNISN] || '').trim();
          let rawNama = String(row[colNama] || '').trim();
          
          if (!rawNISN || !rawNama) continue; // skip rows missing key inputs

          let rawTempat = colTempat !== -1 ? String(row[colTempat] || 'Wonosobo').trim() : 'Wonosobo';
          
          // Format Date elegantly
          let rawTanggal = '';
          if (colTanggal !== -1) {
            let cellVal = row[colTanggal];
            if (typeof cellVal === 'number') {
              // Handle Excel Serial Date
              try {
                const jsDate = new Date((cellVal - 25569) * 86400 * 1000);
                rawTanggal = jsDate.toISOString().split('T')[0];
              } catch(e) {
                rawTanggal = '';
              }
            } else {
              rawTanggal = String(cellVal || '').trim();
            }
          }

          // Strict format: Ensure date contains YYYY-MM-DD pattern
          if (rawTanggal.includes('/')) {
            // converts DD/MM/YYYY to YYYY-MM-DD or similar
            const parts = rawTanggal.split('/');
            if (parts.length === 3) {
              if (parts[2].length === 4) { // D/M/YYYY or DD/MM/YYYY
                rawTanggal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
              } else if (parts[0].length === 4) { // YYYY/MM/DD
                rawTanggal = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
              }
            }
          } else if (rawTanggal.includes('-')) {
            const parts = rawTanggal.split('-');
            if (parts.length === 3 && parts[2].length === 4) { // DD-MM-YYYY
              rawTanggal = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
          }

          let rawKelas = colKelas !== -1 ? String(row[colKelas] || 'IX-A').trim() : 'IX-A';
          
          // Status check
          let statusText = colStatus !== -1 ? String(row[colStatus] || 'LULUS').toUpperCase() : 'LULUS';
          let statusResult: 'LULUS' | 'TIDAK LULUS' = 'LULUS';
          if (statusText.includes('TIDAK') || statusText.includes('BELUM') || statusText.includes('FAIL')) {
            statusResult = 'TIDAK LULUS';
          }

          // Build staged candidate record
          validParsedStudents.push({
            nisn: rawNISN,
            nama: rawNama,
            tempat_lahir: rawTempat,
            tanggal_lahir: rawTanggal,
            kelas: rawKelas,
            status_kelulusan: statusResult
          });
        }

        if (validParsedStudents.length === 0) {
          setExcelError('Tidak ada baris siswa yang valid untuk diimpor. Periksa kembali struktur data.');
        } else {
          setExcelPreview(validParsedStudents);
          setExcelSuccess(`Berhasil membaca ${validParsedStudents.length} siswa dari Excel. Silakan konfirmasi untuk mengunggah ke pangkalan data.`);
        }
      } catch (err) {
        setExcelError('Gagal membaca berkas Excel. Format tidak didukung.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCommitExcelUpload = async () => {
    if (excelPreview.length === 0) return;
    setExcelError('');
    setExcelSuccess('');

    try {
      const resp = await fetch('/api/admin/siswa/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ students: excelPreview })
      });
      const data = await resp.json();
      if (resp.ok && data.success) {
        setExcelSuccess(data.message);
        setExcelPreview([]);
        // refresh data tables
        fetchStudents();
        fetchStats();
      } else {
        setExcelError(data.message || 'Gagal mengimpor data ke server.');
      }
    } catch (e) {
      setExcelError('Koneksi terputus saat mengunggah data.');
    }
  };

  // Filter students by search bar queries
  const filteredStudents = students.filter(s => 
    s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.nisn.includes(searchQuery) ||
    s.kelas.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Verification Screen before showing Dashboard
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-12">
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Login Administrator</h2>
            <p className="text-xs text-gray-400">Silakan masukkan akun kearsipan admin resmi sekolah.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Field Username */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <User className="h-4 w-4" />
                </span>
                <input
                  id="admin-user-input"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="block w-full pl-9 pr-3 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
              </div>
            </div>

            {/* Field Password */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  id="admin-pwd-input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password admin"
                  className="block w-full pl-9 pr-10 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Hint Notice */}
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-800 leading-relaxed">
              💡 <strong>Petunjuk Menguji:</strong> Gunakan kredensial bawaan system: <br />
              Username: <code className="font-mono font-bold">admin</code> | Password: <code className="font-mono font-bold">admin123</code>
            </div>

            {/* Login button */}
            <button
              id="admin-login-submit"
              type="submit"
              className="w-full py-3 px-4 font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md transition-all flex justify-center items-center gap-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              MASUK KE DASHBOARD
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active Admin Screen View
  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Admin Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 tracking-wider uppercase">DASHBOARD ADMIN</span>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Selamat Datang, Administrator</h2>
          <p className="text-xs text-gray-400 mt-0.5">Kelola seluruh data kelulusan siswa, rilis countdown, dan impor siswa di sini.</p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-xl transition-colors shrink-0 inline-flex items-center gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          LOGOUT ADMIN
        </button>
      </div>

      {/* Admin Central Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Sidebar Nav (3 columns) */}
        <div className="lg:col-span-3 bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-1.5">
          <span className="block px-3 text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-2">MENU UTAMA</span>
          {[
            { id: 'dashboard', label: 'Dashboard & Statistik', icon: LayoutDashboard },
            { id: 'siswa', label: 'Data Kelulusan Siswa', icon: Users },
            { id: 'settings', label: 'Atur Waktu & Sekolah', icon: Settings },
            { id: 'password', label: 'Ubah Sandi Admin', icon: Key }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all text-left gap-2.5 ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/10' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span>{tab.label}</span>
              <ChevronRight className="h-3 w-3 ml-auto opacity-55" />
            </button>
          ))}
        </div>

        {/* Workspace Display Area (9 columns) */}
        <div className="lg:col-span-9 space-y-6">
          
          {/* TAB 1: DASHBOARD STATS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-sm font-semibold tracking-wider text-gray-900">IKHTISAR KELULUSAN KELAS IX</div>
              
              {/* Stats Bento Grid elements */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Stat block 1 */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Jumlah Pengunjung</span>
                  <span className="text-2xl font-black text-blue-900 block mt-2 font-mono">
                    {stats.visitor_count}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1 block">Total hits layan cek</span>
                </div>

                {/* Stat block 2 */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <span className="text-xs text-gray-400 font-semibold block uppercase">Total Siswa</span>
                  <span className="text-2xl font-black text-gray-900 block mt-2 font-mono">
                    {stats.total_students}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1 block">Terdaftar sekolah</span>
                </div>

                {/* Stat block 3 */}
                <div className="bg-white p-5 rounded-2xl border border-emerald-100 bg-emerald-50/10 shadow-sm">
                  <span className="text-xs text-emerald-600 font-semibold block uppercase">Siswa Lulus</span>
                  <span className="text-2xl font-black text-emerald-600 block mt-2 font-mono">
                    {stats.lulus_count}
                  </span>
                  <span className="text-[10px] text-emerald-600/70 mt-1 block">Badge hijau kelulusan</span>
                </div>

                {/* Stat block 4 */}
                <div className="bg-white p-5 rounded-2xl border border-rose-100 bg-rose-50/10 shadow-sm">
                  <span className="text-xs text-rose-600 font-semibold block uppercase">Tidak Lulus</span>
                  <span className="text-2xl font-black text-rose-500 block mt-2 font-mono">
                    {stats.tidak_lulus_count}
                  </span>
                  <span className="text-[10px] text-rose-500/70 mt-1 block">Perlu pendampingan</span>
                </div>

              </div>

              {/* Quick info banner */}
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 text-sm mb-3">Sistem Pengumuman Siap</h4>
                <div className="p-4 bg-blue-50 border border-blue-100/60 rounded-xl text-xs text-blue-800 leading-relaxed space-y-2">
                  <p>
                    ✓ Layanan cek kelulusan sekolah Anda menggunakan verifikasi ganda berbasis <strong>NISN</strong> dan <strong>Tanggal Lahir</strong> terdaftar.
                  </p>
                  <p>
                    ✓ Untuk melakukan simulasi, Anda dapat mengubah <strong>Waktu Pengumuman</strong> pada tab pengaturan menu sebelah kiri ke parameter tanggal lampau (misal: kurangi 1 hari dari waktu sekarang) demi membuka form portal cek kelulusan secara instan.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DATA SISWA CRUD WITH BULK EXCEL IMPORTER / EXPORTER */}
          {activeTab === 'siswa' && (
            <div className="space-y-6 animate-fade-in">

              {/* Action commands layout */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full sm:max-w-xs">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Search className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari Nama, NISN, atau Kelas"
                    className="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    id="add-siswa-btn"
                    onClick={() => {
                      setShowStudentForm(!showStudentForm);
                      setIsEditingStudent(null);
                      setStudentForm({
                        nisn: '',
                        nama: '',
                        tempat_lahir: 'Wonosobo',
                        tanggal_lahir: '',
                        kelas: '',
                        status_kelulusan: 'LULUS'
                      });
                      setSiswaErrorMsg('');
                      setSiswaSuccessMsg('');
                    }}
                    className="px-3.5 py-2 font-semibold text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <Plus className="h-4 w-4" />
                    TAMBAH SISWA
                  </button>

                  <button
                    id="excel-import-btn"
                    onClick={handleExcelImportClick}
                    className="px-3.5 py-2 font-semibold text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-100"
                  >
                    <Upload className="h-4 w-4" />
                    IMPOR EXCEL
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleExcelFileChange}
                    className="hidden"
                  />

                  <button
                    id="excel-export-btn"
                    onClick={handleExportExcel}
                    className="px-3.5 py-2 font-semibold text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors flex items-center gap-1.5 border border-emerald-100"
                  >
                    <Download className="h-4 w-4" />
                    EKSPOR EXCEL
                  </button>
                </div>
              </div>

              {/* Bulk import Excel preview block if exists */}
              {excelPreview.length > 0 && (
                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-200 space-y-4 animate-slide-down">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-6 w-6 text-amber-500" />
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">Pratinjau Data Impor Excel</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{excelSuccess}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setExcelPreview([])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Scroller preview tables */}
                  <div className="overflow-x-auto rounded-xl border border-amber-200 max-h-60 bg-white">
                    <table className="min-w-full divide-y divide-amber-100 text-[11px]">
                      <thead className="bg-amber-50">
                        <tr>
                          {['NISN', 'Nama Lengkap', 'Tempat Lahir', 'Tanggal Lahir', 'Kelas', 'Status'].map((col, idx) => (
                            <th key={idx} className="px-3 py-2 text-left font-bold text-amber-900 uppercase">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {excelPreview.slice(0, 10).map((s, idx) => (
                          <tr key={idx} className="hover:bg-amber-50/10">
                            <td className="px-3 py-1.5 font-mono">{s.nisn}</td>
                            <td className="px-3 py-1.5 font-bold">{s.nama}</td>
                            <td className="px-3 py-1.5">{s.tempat_lahir}</td>
                            <td className="px-3 py-1.5">{s.tanggal_lahir}</td>
                            <td className="px-3 py-1.5">{s.kelas}</td>
                            <td className="px-3 py-1.5">
                              <span className={`px-1.5 py-0.5 rounded-sm font-bold text-[9px] ${s.status_kelulusan === 'LULUS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {s.status_kelulusan}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {excelPreview.length > 10 && (
                    <p className="text-[10px] text-gray-400 text-right font-medium">
                      * Menampilkan 10 dari {excelPreview.length} total baris data siswa excel
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setExcelPreview([])}
                      className="px-4 py-2 bg-white border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg"
                    >
                      Batalkan
                    </button>
                    <button
                      id="commit-import-btn"
                      onClick={handleCommitExcelUpload}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white rounded-lg inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Check className="h-4 w-4" />
                      SIMPAN & UPDATE SISWA
                    </button>
                  </div>
                </div>
              )}

              {excelError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <X className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{excelError}</span>
                </div>
              )}

              {excelSuccess && excelPreview.length === 0 && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{excelSuccess}</span>
                </div>
              )}

              {/* Status alerts */}
              {siswaSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>{siswaSuccessMsg}</span>
                </div>
              )}

              {siswaErrorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{siswaErrorMsg}</span>
                </div>
              )}

              {/* Popup / Inline student Add/Edit Form */}
              {showStudentForm && (
                <form onSubmit={handleStudentFormSubmit} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-md space-y-4 animate-slide-down">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-50">
                    <h4 className="font-bold text-gray-900 text-sm">
                      {isEditingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru Manual'}
                    </h4>
                    <button 
                      type="button"
                      onClick={() => setShowStudentForm(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* NISN */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">NISN (10 Digit)</label>
                      <input
                        type="text"
                        maxLength={12}
                        value={studentForm.nisn}
                        onChange={(e) => setStudentForm({ ...studentForm, nisn: e.target.value.replace(/\D/g, '') })}
                        placeholder="Nisn"
                        className="block w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:border-blue-500 transition-all text-gray-800"
                      />
                    </div>

                    {/* Nama */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Nama Lengkap</label>
                      <input
                        type="text"
                        value={studentForm.nama}
                        onChange={(e) => setStudentForm({ ...studentForm, nama: e.target.value })}
                        placeholder="Nama Lengkap"
                        className="block w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:border-blue-500 transition-all text-gray-800"
                      />
                    </div>

                    {/* Kelas */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Kelas</label>
                      <input
                        type="text"
                        value={studentForm.kelas}
                        onChange={(e) => setStudentForm({ ...studentForm, kelas: e.target.value })}
                        placeholder="Contoh: IX-A"
                        className="block w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:border-blue-500 transition-all text-gray-800"
                      />
                    </div>

                    {/* Tempat Lahir */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Tempat Lahir</label>
                      <input
                        type="text"
                        value={studentForm.tempat_lahir}
                        onChange={(e) => setStudentForm({ ...studentForm, tempat_lahir: e.target.value })}
                        placeholder="Tempat Lahir"
                        className="block w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:border-blue-500 transition-all text-gray-800"
                      />
                    </div>

                    {/* Tanggal Lahir (YYYY-MM-DD) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Tanggal Lahir</label>
                      <input
                        type="date"
                        value={studentForm.tanggal_lahir}
                        onChange={(e) => setStudentForm({ ...studentForm, tanggal_lahir: e.target.value })}
                        className="block w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:border-blue-500 transition-all text-gray-800"
                      />
                    </div>

                    {/* Status Kelulusan */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Status Kelulusan</label>
                      <select
                        value={studentForm.status_kelulusan}
                        onChange={(e) => setStudentForm({ ...studentForm, status_kelulusan: e.target.value as any })}
                        className="block w-full px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg focus:border-blue-500 transition-all text-gray-800"
                      >
                        <option value="LULUS">LULUS</option>
                        <option value="TIDAK LULUS">TIDAK LULUS</option>
                      </select>
                    </div>

                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                    <button
                      type="button"
                      onClick={() => setShowStudentForm(false)}
                      className="px-4 py-2 bg-white border border-gray-200 text-xs font-semibold text-gray-600 rounded-lg"
                    >
                      Batalkan
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-lg inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="h-4 w-4" />
                      SIMPAN DATA SISWA
                    </button>
                  </div>
                </form>
              )}

              {/* Main Student list records table */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-100 text-xs">
                    <thead className="bg-gray-50/70 font-semibold text-gray-500 uppercase tracking-wider text-left">
                      <tr>
                        <th className="px-5 py-3.5">NISN</th>
                        <th className="px-5 py-3.5">Nama Lengkap</th>
                        <th className="px-5 py-3.5">TTL</th>
                        <th className="px-5 py-3.5">Kelas</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-gray-400 font-medium">
                            {students.length === 0 ? 'Pangkalan data masih kosong. Silakan tambahkan siswa manual atau impor Excel.' : 'Data pencarian tidak ditemukan.'}
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((siswa) => (
                          <tr key={siswa.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-5 py-3 font-mono font-bold text-blue-900">{siswa.nisn}</td>
                            <td className="px-5 py-3 font-semibold text-gray-900">{siswa.nama}</td>
                            <td className="px-5 py-3 text-gray-500">{`${siswa.tempat_lahir}, ${siswa.tanggal_lahir}`}</td>
                            <td className="px-5 py-3 font-semibold text-gray-500">{siswa.kelas}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${siswa.status_kelulusan === 'LULUS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                                {siswa.status_kelulusan}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex justify-center items-center gap-1">
                                <button
                                  onClick={() => handleEditStudentClick(siswa)}
                                  className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(siswa.id, siswa.nama)}
                                  className="p-1 text-gray-400 hover:text-rose-600 rounded-md hover:bg-gray-100 transition-colors"
                                  title="Hapus"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: ANNOUNCEMENT SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-sm font-semibold tracking-wider text-gray-900">PENGATURAN SEKOLAH & WAKTU RILIS</div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <form onSubmit={handleSettingsSubmit} className="space-y-4">
                  
                  {settingsSuccessMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{settingsSuccessMsg}</span>
                    </div>
                  )}

                  {settingsErrorMsg && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                      <X className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>{settingsErrorMsg}</span>
                    </div>
                  )}

                  {/* Grid Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Nama Sekolah */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Nama Sekolah</label>
                      <input
                        type="text"
                        value={settingsForm.school_name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, school_name: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                        placeholder="Nama sekolah"
                      />
                    </div>

                    {/* Tahun Ajaran */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Tahun Ajaran</label>
                      <input
                        type="text"
                        value={settingsForm.academic_year}
                        onChange={(e) => setSettingsForm({ ...settingsForm, academic_year: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                        placeholder="Contoh: 2025/2026"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Email Sekolah</label>
                      <input
                        type="email"
                        value={settingsForm.email}
                        onChange={(e) => setSettingsForm({ ...settingsForm, email: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                        placeholder="Email"
                      />
                    </div>

                    {/* Telepon */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Telepon Sekolah</label>
                      <input
                        type="text"
                        value={settingsForm.phone}
                        onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                        placeholder="Nomor Telepon"
                      />
                    </div>

                    {/* Alamat */}
                    <div className="space-y-1 md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 uppercase">Alamat Lengkap</label>
                      <input
                        type="text"
                        value={settingsForm.address}
                        onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                        className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                        placeholder="Alamat Lengkap"
                      />
                    </div>

                    {/* Waktu Pengumuman Rilis (ISO string mapping) */}
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-gray-600 uppercase text-blue-800 font-bold">Waktu Rilis Pengumuman</label>
                      <input
                        id="announcement-time-picker"
                        type="datetime-local"
                        value={settingsForm.announcement_time}
                        onChange={(e) => setSettingsForm({ ...settingsForm, announcement_time: e.target.value })}
                        className="block w-full px-3 py-2 border border-blue-200 bg-blue-50/10 rounded-xl text-xs font-bold focus:border-blue-500 transition-all text-gray-800"
                      />
                      <p className="text-[10px] text-gray-400 font-medium">
                        * Sesuaikan waktu rilis. Melewati parameter ini akan membuka form pengecekan siswa secara otomatis.
                      </p>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-gray-50 text-right">
                    <button
                      id="save-settings-btn"
                      type="submit"
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      SIMPAN PENGATURAN
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

          {/* TAB 4: PASSWORD CHANGE */}
          {activeTab === 'password' && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-sm font-semibold tracking-wider text-gray-900">UBAH KATA SANDI ADMINISTRATOR</div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm max-w-md">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  
                  {pwdSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{pwdSuccess}</span>
                    </div>
                  )}

                  {pwdError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                      <X className="h-4 w-4 text-rose-500 shrink-0" />
                      <span>{pwdError}</span>
                    </div>
                  )}

                  {/* Sandi Lama */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase">Kata Sandi Lama</label>
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="Masukkan sandi lama"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                    />
                  </div>

                  {/* Sandi Baru */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase">Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Masukkan sandi baru (min 6 karakter)"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                    />
                  </div>

                  {/* Konfirmasi Sandi Baru */}
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase">Konfirmasi Kata Sandi Baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi sandi baru"
                      className="block w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-medium focus:border-blue-500 transition-all text-gray-800"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      id="save-pwd-btn"
                      type="submit"
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl shadow-md transition-all inline-flex justify-center items-center gap-1.5"
                    >
                      <Save className="h-4 w-4" />
                      PERBARUI KATA SANDI
                    </button>
                  </div>

                </form>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
