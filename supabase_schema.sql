-- SQL SCHEMA UNTUK SUPABASE
-- Silakan salin dan jalankan query ini di SQL Editor di dashboard Supabase Anda.

-- 1. Table: students (menyimpan data siswa)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    nisn TEXT UNIQUE NOT NULL,
    nama TEXT NOT NULL,
    tempat_lahir TEXT NOT NULL,
    tanggal_lahir TEXT NOT NULL, -- Format: YYYY-MM-DD
    kelas TEXT NOT NULL,
    status_kelulusan TEXT NOT NULL CHECK (status_kelulusan IN ('LULUS', 'TIDAK LULUS')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Buat indeks pencarian cepat berdasarkan NISN & tanggal lahir
CREATE INDEX IF NOT EXISTS idx_students_search ON students (nisn, tanggal_lahir);

-- 2. Table: settings (konfigurasi nama sekolah, tahun ajaran, dsb)
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);

-- Isi data awal settings jika kosong
INSERT INTO settings (key, value)
VALUES (
    'announcement_settings',
    '{
        "school_name": "SMP Negeri 1 Wonosobo",
        "academic_year": "2025/2026",
        "address": "Jl. Merdeka No. 12, Wonosobo, Jawa Tengah",
        "phone": "(0286) 321xxx",
        "email": "info@smpn1wonosobo.sch.id",
        "announcement_time": "2026-06-15T10:00:00.000Z"
    }'::jsonb
)
ON CONFLICT (key) DO NOTHING;

-- 3. Table: stats (untuk jumlah pengunjung)
CREATE TABLE IF NOT EXISTS stats (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0
);

-- Isi nilai awal pengunjung jika kosong
INSERT INTO stats (key, value)
VALUES ('visitor_count', 53)
ON CONFLICT (key) DO NOTHING;

-- 4. Table: admin (untuk otentikasi admin)
CREATE TABLE IF NOT EXISTS admin (
    username TEXT PRIMARY KEY,
    password_hash TEXT NOT NULL
);

-- Isi kata sandi bawaan admin (username: admin, password: admin123 dengan salt sha256)
-- Password hash: sha256("admin123" + "smp_kelulusan_salt_2026")
-- Yang menghasilkan di bawah ini:
INSERT INTO admin (username, password_hash)
VALUES ('admin', '424b91763a0ef076e4c278036e4fcb51a44e5cf4cf965ee923be2a9bba145952')
ON CONFLICT (username) DO NOTHING;
