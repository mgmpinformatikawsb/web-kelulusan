/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Calendar, ShieldAlert, BadgeCheck, Clock, ArrowRight, UserCheck, Eye } from 'lucide-react';
import { AnnouncementSettings } from '../types';

interface LandingPageProps {
  settings: AnnouncementSettings | null;
  onNavigate: (page: string) => void;
}

export default function LandingPage({ settings, onNavigate }: LandingPageProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isLive, setIsLive] = useState(false);

  // Format announcement release date
  const releaseDateFormatted = settings?.announcement_time
    ? new Date(settings.announcement_time).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  const releaseTimeFormatted = settings?.announcement_time
    ? new Date(settings.announcement_time).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : '';

  useEffect(() => {
    if (!settings?.announcement_time) return;

    const timer = setInterval(() => {
      const target = new Date(settings.announcement_time).getTime();
      const now = Date.now();
      const diff = target - now;

      if (diff <= 0) {
        setIsLive(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
      } else {
        setIsLive(false);
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [settings?.announcement_time]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-8 animate-fade-in">
      
      {/* Hero / Welcome Card Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl shadow-blue-600/10">
        
        {/* Subtle decorative background circles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-xl -ml-20 -mb-20 pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
          
          {/* Hero text content */}
          <div className="lg:col-span-7 space-y-6">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-500/30 text-blue-100 uppercase tracking-widest gap-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`}></span>
              {isLive ? 'Pengumuman Dibuka' : 'Menghitung Mundur Rilis'}
            </span>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Selamat Datang Layanan Kelulusan Kelas IX
            </h2>
            
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed max-w-xl">
              Selamat datang pada layanan Pengumuman Kelulusan Siswa Kelas IX. Media informasi resmi untuk mengakses keputusan hasil akhir studi bagi seluruh siswa-siswi SMP secara transparan, praktis, dan akurat.
            </p>

            <div className="pt-2">
              <button
                id="hero-go-check-btn"
                onClick={() => onNavigate('cek')}
                className="inline-flex items-center justify-center px-6 py-3.5 rounded-xl text-base font-bold text-blue-900 bg-white hover:bg-blue-50 active:scale-95 transition-all shadow-md gap-2"
              >
                Lihat Hasil Kelulusan
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Hero Visual Block */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[340px] aspect-square rounded-2xl bg-white/5 border border-white/10 p-6 flex flex-col justify-between overflow-hidden shadow-2xl backdrop-blur-sm">
              <div className="flex justify-between items-start">
                <div className="h-10 w-10 rounded-lg bg-blue-500/20 text-white flex items-center justify-center">
                  <UserCheck className="h-6 w-6" />
                </div>
                <div className="flex flex-col items-end text-right font-mono text-xs text-blue-200">
                  <span>TP. {settings?.academic_year || '2025/2026'}</span>
                  <span>SMP KELAS IX</span>
                </div>
              </div>

              {/* Central design element */}
              <div className="my-auto py-4 space-y-3">
                <div className="text-xs text-blue-200 font-semibold tracking-wide uppercase">STATUS PENGUMUMAN</div>
                {isLive ? (
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-emerald-400 font-sans tracking-wide">AKTIF / TERBUKA</p>
                    <p className="text-xs text-blue-100">Silakan masukkan NISN dan Tanggal Lahir Anda pada formulir cek.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-amber-300 font-sans tracking-wide">HITUNG MUNDUR</p>
                    <p className="text-xs text-blue-100">Menunggu kepastian waktu rilis dewan kelulusan sekolah.</p>
                  </div>
                )}
              </div>

              {/* Status display footer */}
              <div className="pt-4 border-t border-white/10 flex justify-between items-center text-xs text-blue-100">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-300" />
                  <span>Waktu Indonesia Barat (WIB)</span>
                </div>
                <span className="font-mono text-blue-200 animate-pulse">Online</span>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Countdown Timer Block */}
      {!isLive && settings?.announcement_time && (
        <section className="bg-amber-50 border border-amber-200/60 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="text-center space-y-4 max-w-2xl mx-auto animate-fade-in">
            <h3 className="text-xs font-bold tracking-widest text-amber-800 uppercase flex items-center justify-center gap-2">
              <Clock className="h-4 w-4 animate-spin-slow text-amber-600" />
              SISA WAKTU MENUJU PENGUMUMAN RESMI {settings?.school_name?.toUpperCase() || ''}
            </h3>
            
            <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
              {[
                { label: 'Hari', value: timeLeft.days },
                { label: 'Jam', value: timeLeft.hours },
                { label: 'Menit', value: timeLeft.minutes },
                { label: 'Detik', value: timeLeft.seconds }
              ].map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-3 border border-amber-200 text-center shadow-xs">
                  <div className="text-2xl sm:text-3xl font-extrabold text-blue-900 font-mono">
                    {String(item.value).padStart(2, '0')}
                  </div>
                  <div className="text-[10px] sm:text-xs font-semibold text-amber-800/80 uppercase tracking-wider">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-amber-800 leading-relaxed font-medium">
                Pengumuman hasil akhir kelulusan baru akan dibuka serentak pada tanggal kelulusan nasional.
              </p>
              <p className="text-xs text-slate-500">
                Waktu Rilis Terjadwal: <span className="font-semibold text-slate-700">{releaseDateFormatted} Pukul {releaseTimeFormatted}</span>
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Quick Access Helper for Live Portal */}
      {isLive && (
        <div className="text-center p-6 bg-slate-100 rounded-3xl border border-slate-200/60">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PENGUMUMAN TELAH DIBUKA SEJAK</p>
          <p className="text-sm font-bold text-slate-800 mt-1">{releaseDateFormatted} pukul {releaseTimeFormatted}</p>
        </div>
      )}

    </div>
  );
}
