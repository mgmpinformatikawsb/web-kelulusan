/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Mail, Phone, MapPin, Globe, GraduationCap } from 'lucide-react';
import { AnnouncementSettings } from '../types';

interface FooterProps {
  settings: AnnouncementSettings | null;
}

export default function Footer({ settings }: FooterProps) {
  const currentYear = new Date().getFullYear();
  const schoolName = settings?.school_name || "SMP Negeri Pilihan";
  const address = settings?.address || "Jl. Pendidikan No. 12, Indonesia";
  const phone = settings?.phone || "(0286) 321xxx";
  const email = settings?.email || "info@sekolah.sch.id";

  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Col 1 - School Details */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/10">
                <GraduationCap className="h-6 w-6" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                {schoolName}
              </span>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed max-w-sm">
              Sistem Pengumuman Kelulusan Resmi Kelas IX Kelas Unggulan & Reguler. Pastikan kerahasiaan data pribadi Anda terjaga selama pengecekan hasil kelulusan.
            </p>
          </div>

          {/* Col 2 - Address & Location */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              Hubungi Kami
            </h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start">
                <MapPin className="h-5 w-5 text-blue-500 mr-2 shrink-0 mt-0.5" />
                <span>{address}</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-4 w-4 text-blue-500 mr-2.5 shrink-0" />
                <span>{phone}</span>
              </li>
              <li className="flex items-center">
                <Mail className="h-4 w-4 text-blue-500 mr-2.5 shrink-0" />
                <a href={`mailto:${email}`} className="hover:text-blue-400 transition-colors">
                  {email}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3 - General Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              Informasi Tambahan
            </h3>
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-800 text-xs text-gray-400 leading-relaxed">
              <p className="font-semibold text-gray-300 mb-1">PENTING:</p>
              Hasil ini bersifat final dan rahasia. Siswa dilarang keras melakukan selebrasi berlebihan, aksi corat-coret seragam, konvoi kendaraan bermotor, atau mengganggu ketertiban umum. Rayakan kelulusan dengan penuh syukur bersama keluarga di rumah.
            </div>
          </div>

        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-500">
          <p>
            &copy; {currentYear} {schoolName}. Hak Cipta Dilindungi Undang-Undang.
          </p>
          <p className="mt-2 sm:mt-0 flex items-center gap-1">
            <span>Sistem Informasi Kelulusan Sekolah Modern</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
