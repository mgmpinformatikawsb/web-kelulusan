/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Search, Calendar, ChevronLeft, ArrowRight, FileText, AlertCircle, Sparkles, CheckCircle, ShieldAlert, BadgeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Siswa, AnnouncementSettings } from '../types';

interface CekKelulusanProps {
  settings: AnnouncementSettings | null;
  onNavigate: (page: string) => void;
}

export default function CekKelulusan({ settings, onNavigate }: CekKelulusanProps) {
  const [nisn, setNisn] = useState('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResult, setSuccessResult] = useState<Siswa | null>(null);
  
  // Announcement timer state
  const [isLive, setIsLive] = useState(false);
  const [countDown, setCountDown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!settings?.announcement_time) return;

    const updateTimer = () => {
      const target = new Date(settings.announcement_time).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setIsLive(true);
      } else {
        setIsLive(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountDown({ days, hours, minutes, seconds });
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [settings?.announcement_time]);

  // Handle standard Confetti explosion
  const launchPremiumConfetti = () => {
    const duration = 4 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 100 };

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      // since particles fall down, animate a bit higher than random
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  };

  const handleCek = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessResult(null);

    // Form inputs validation
    if (!nisn.trim()) {
      setErrorMsg('NISN wajib diisi!');
      return;
    }
    if (!tanggalLahir) {
      setErrorMsg('Tanggal Lahir wajib diisi!');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/public/cek-kelulusan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nisn: nisn.trim(),
          tanggal_lahir: tanggalLahir,
        }),
      });

      const resJson = await response.json();

      if (!response.ok || !resJson.success) {
        setErrorMsg(resJson.message || 'Gagal mencari data siswa. Silakan periksa kembali.');
      } else {
        const student: Siswa = resJson.data;
        setSuccessResult(student);
        
        // Trigger standard confetti if passed
        if (student.status_kelulusan === 'LULUS') {
          launchPremiumConfetti();
        }
      }
    } catch (err) {
      setErrorMsg('Terjadi kesalahan jaringan atau server sedang sibuk. Silakan coba kembali.');
    } finally {
      setLoading(false);
    }
  };

  const resetPencarian = () => {
    setNisn('');
    setTanggalLahir('');
    setErrorMsg('');
    setSuccessResult(null);
  };

  // Human friendly release date format for unreleased message
  const releaseDateFormatted = settings?.announcement_time
    ? new Date(settings.announcement_time).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Jakarta'
      })
    : '';

  return (
    <div className="max-w-3xl mx-auto pb-16">
      
      {/* Back to Home Button */}
      <button
        onClick={() => onNavigate('landing')}
        className="inline-flex items-center text-sm text-gray-500 hover:text-blue-600 font-medium mb-6 transition-colors group"
      >
        <ChevronLeft className="h-4 w-4 mr-1 group-hover:-translate-x-1 transition-transform" />
        Kembali ke Beranda
      </button>

      {/* BEFORE RELEASE (COUNTDOWN SCREEN) */}
      {!isLive ? (
        <section className="bg-white rounded-3xl p-8 border border-gray-100 shadow-md text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
            <ShieldAlert className="h-8 w-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Cek Kelulusan Belum Dibuka</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
              Formulir cek kelulusan terkunci secara otomatis. Pengumuman kelulusan baru akan dibuka pada tanggal dan jam yang telah ditentukan sekolah.
            </p>
          </div>

          {/* Countdown timer banner */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 rounded-2xl p-6 border border-amber-100 max-w-lg mx-auto">
            <h4 className="text-xs font-semibold tracking-wider text-amber-800 uppercase mb-3 text-center">
              WAKTU HITUNG MUNDUR RILIS
            </h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Hari', val: countDown.days },
                { label: 'Jam', val: countDown.hours },
                { label: 'Menit', val: countDown.minutes },
                { label: 'Detik', val: countDown.seconds }
              ].map((item, idx) => (
                <div key={idx} className="bg-white rounded-xl p-2.5 border border-amber-200">
                  <span className="block text-2xl font-extrabold text-blue-900 font-mono">
                    {String(item.val).padStart(2, '0')}
                  </span>
                  <span className="block text-[10px] text-amber-800/80 font-semibold uppercase">{item.label}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-amber-900/70 font-medium mt-1">
              Rilis pada: <span className="font-bold underline">{releaseDateFormatted} WIB</span>
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl max-w-md mx-auto text-xs text-gray-400">
            "Pengumuman kelulusan akan dibuka pada tanggal yang telah ditentukan." Silakan simpan NISN Anda untuk verifikasi nanti.
          </div>
        </section>
      ) : (

        /* CEK KELULUSAN ACTIVE PORTAL */
        <div className="space-y-8">
          
          {/* Header Description */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Cek Hasil Kelulusan</h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Masukkan NISN dan Tanggal Lahir sesuai data sekolah untuk melihat hasil kelulusan.
            </p>
          </div>

          {/* Search Form Card (If no success result has been fetched yet) */}
          {!successResult ? (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-md">
              <form onSubmit={handleCek} className="space-y-6">
                
                {errorMsg && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-sm flex items-start gap-2.5 animate-shake">
                    <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Field 1: NISN */}
                <div className="space-y-2">
                  <label htmlFor="nisn" className="block text-sm font-semibold text-gray-700">
                    NISN (Nomor Induk Siswa Nasional)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <FileText className="h-5 w-5" />
                    </div>
                    <input
                      id="nisn"
                      name="nisn"
                      type="text"
                      maxLength={12}
                      value={nisn}
                      onChange={(e) => setNisn(e.target.value.replace(/\D/g, ''))} // Numeric only
                      placeholder="Masukkan 10 digit NISN Anda"
                      className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 placeholder-gray-400 text-gray-900 font-medium transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    * Periksa angka dengan teliti. Contoh NISN: 1234567890
                  </p>
                </div>

                {/* Field 2: Tanggal Lahir Datepicker */}
                <div className="space-y-2">
                  <label htmlFor="tanggal-lahir" className="block text-sm font-semibold text-gray-700">
                    Tanggal Lahir
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Calendar className="h-5 w-5" />
                    </div>
                    <input
                      id="tanggal-lahir"
                      name="tanggal_lahir"
                      type="date"
                      value={tanggalLahir}
                      onChange={(e) => setTanggalLahir(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 text-gray-900 font-medium transition-all"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    * Harus sesuai dengan format tanggal lahir yang terdaftar pada Akta / Ijazah SD.
                  </p>
                </div>

                {/* Cek Kelulusan Submit Button */}
                <button
                  id="submit-cek-btn"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-4 px-6 rounded-xl text-base font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20 active:scale-98 transition-all gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {`SEDANG MEMVERIFIKASI...`}
                    </>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      CEK KELULUSAN
                    </>
                  )}
                </button>

              </form>
            </div>
          ) : (

            /* ELEGANT RESULTS SCREEN CARD */
            <div className="space-y-6 animate-fade-in">
              <div className="text-center font-bold text-sky-800 uppercase text-xs tracking-widest flex items-center justify-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                DOKUMEN KELULUSAN RESMI DIKUNCI & DINYATAKAN VALID
              </div>

              {/* Card Container */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                
                {/* Visual Status Header with Dynamic colors */}
                <div className={`p-8 text-center text-white ${
                  successResult.status_kelulusan === 'LULUS' 
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-500' 
                    : 'bg-gradient-to-r from-rose-600 to-pink-500'
                }`}>
                  <div className="mx-auto h-16 w-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    {successResult.status_kelulusan === 'LULUS' ? (
                      <CheckCircle className="h-10 w-10 text-white" />
                    ) : (
                      <BadgeX className="h-10 w-10 text-white" />
                    )}
                  </div>
                  <span className="text-xs uppercase tracking-widest text-blue-50 font-bold">STATUS HASIL KELULUSAN</span>
                  
                  {/* GREEN LARGE BADGE FOR PASSING, RED FOR NOT PASSING */}
                  <h3 id="status-badge" className="text-4xl font-black mt-2 tracking-wider">
                    {successResult.status_kelulusan}
                  </h3>
                </div>

                {/* Student Details Grid */}
                <div className="p-6 sm:p-8 space-y-6">
                  
                  {/* Table Grid details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: 'Nama Lengkap Siswa', val: successResult.nama, highlight: true },
                      { label: 'NISN (Nasional)', val: successResult.nisn, highlight: false },
                      { label: 'Tempat, Tanggal Lahir', val: `${successResult.tempat_lahir}, ${new Date(successResult.tanggal_lahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })}`, highlight: false },
                      { label: 'Kelas', val: successResult.kelas, highlight: false }
                    ].map((row, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                          {row.label}
                        </span>
                        <span className={`block mt-1 font-bold ${row.highlight ? 'text-lg text-blue-900 font-extrabold' : 'text-sm text-gray-800'}`}>
                          {row.val}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Supportive Message context */}
                  <div className={`p-5 rounded-2xl border text-sm leading-relaxed ${
                    successResult.status_kelulusan === 'LULUS'
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                      : 'bg-rose-50 border-rose-100 text-rose-900'
                  }`}>
                    {successResult.status_kelulusan === 'LULUS' ? (
                      <p>
                        "Selamat! Anda dinyatakan <strong>LULUS</strong> dari {settings?.school_name || "SMP"} pada Tahun Pelajaran {settings?.academic_year || '2025/2026'}. Terima kasih atas dedikasi dan kerja keras yang telah ditunjukkan selama menempuh pendidikan. Semoga sukses pada jenjang pendidikan berikutnya."
                      </p>
                    ) : (
                      <p>
                        "Siswa dinyatakan <strong>TIDAK LULUS</strong> pada Tahun Pelajaran {settings?.academic_year || '2025/2026'}. Silakan berkoordinasi langsung dengan pihak bimbingan konseling dan pimpinan sekolah mengenai syarat ketetapan studi lanjutan."
                      </p>
                    )}
                  </div>

                </div>

                {/* Footer notes - No buttons matching instructions */}
                <div className="bg-gray-50/70 py-4 px-6 border-t border-gray-100 text-center text-xs text-gray-400">
                  Data kelulusan ini diterbitkan secara sah dan dikunci oleh dewan guru.
                </div>

              </div>

              {/* Reset check Form button */}
              <div className="flex justify-center">
                <button
                  id="reset-pencarian-btn"
                  onClick={resetPencarian}
                  className="px-6 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 bg-white hover:bg-gray-50 active:scale-95 transition-all inline-flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Cari NISN Lainnya
                </button>
              </div>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
