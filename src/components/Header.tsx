/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GraduationCap, School } from 'lucide-react';
import { AnnouncementSettings } from '../types';

interface HeaderProps {
  settings: AnnouncementSettings | null;
  onNavigate?: (page: string) => void;
  isAdmin?: boolean;
}

export default function Header({ settings, onNavigate, isAdmin }: HeaderProps) {
  const schoolName = settings?.school_name || "SMP NEGERI KELAS IX";
  const academicYear = settings?.academic_year || "2025/2026";

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-40 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & School Identity */}
          <div 
            className="flex items-center space-x-3 cursor-pointer" 
            onClick={() => onNavigate && onNavigate('landing')}
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 skeleton-fade">
                <span className="text-xs font-semibold tracking-widest text-blue-600 uppercase">
                  Sistem Pengumuman Kelulusan
                </span>
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight line-clamp-1">
                {schoolName}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Tahun Pelajaran {academicYear}
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-3">
            {onNavigate && (
              <>
                <button
                  id="nav-home-btn"
                  onClick={() => onNavigate('landing')}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  Beranda
                </button>
                <button
                  id="nav-cek-btn"
                  onClick={() => onNavigate('cek')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm hover:shadow transition-all"
                >
                  Cek Kelulusan
                </button>
                <button
                  id="nav-admin-btn"
                  onClick={() => onNavigate('admin')}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isAdmin 
                      ? "text-rose-600 bg-rose-50 hover:bg-rose-100" 
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-50 bg-gray-100"
                  }`}
                >
                  {isAdmin ? "Admin Panel" : "Login Admin"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
