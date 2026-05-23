/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Siswa {
  id: string;
  nisn: string;
  nama: string;
  tempat_lahir: string;
  tanggal_lahir: string; // Format: YYYY-MM-DD
  kelas: string;
  status_kelulusan: 'LULUS' | 'TIDAK LULUS';
  created_at?: string;
  updated_at?: string;
}

export interface AnnouncementSettings {
  announcement_time: string; // ISO String (e.g. 2026-06-15T10:00:00.000Z)
  school_name: string;
  academic_year: string;
  address: string;
  phone: string;
  email: string;
  school_logo?: string; // Optional custom SVG path/base64
}

export interface AppStats {
  visitor_count: number;
}

export interface ServerResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

export interface SearchResult {
  siswa?: Siswa;
  isReleased: boolean;
  releaseTime: string;
}
