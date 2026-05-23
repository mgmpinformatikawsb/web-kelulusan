/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import { Siswa, AnnouncementSettings } from "./src/types";

// Prepare data persistence
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DatabaseSchema {
  students: Siswa[];
  settings: AnnouncementSettings;
  stats: {
    visitor_count: number;
  };
  admin: {
    username: string;
    passwordHash: string;
  };
}

// Ensure the data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Generate default configuration
function hashPassword(p: string): string {
  return crypto.createHash("sha256").update(p + "smp_kelulusan_salt_2026").digest("hex");
}

const DEFAULT_ADMIN_PASSWORD_PLAIN = "admin123";

// Set a default announcement time in the future for simulation (e.g., 2026-06-15 at 10:00 UTC)
// The user can freely change this in the admin panel.
const DEFAULT_ANNOUNCEMENT_TIME = "2026-06-15T10:00:00.000Z";

const INITIAL_DB: DatabaseSchema = {
  students: [
    {
      id: "std-001",
      nisn: "1234567890",
      nama: "Ahmad Hidayat",
      tempat_lahir: "Wonosobo",
      tanggal_lahir: "2010-05-12",
      kelas: "IX-A",
      status_kelulusan: "LULUS"
    },
    {
      id: "std-002",
      nisn: "0987654321",
      nama: "Siti Rahmawati",
      tempat_lahir: "Semarang",
      tanggal_lahir: "2010-08-23",
      kelas: "IX-B",
      status_kelulusan: "LULUS"
    },
    {
      id: "std-003",
      nisn: "1122334455",
      nama: "Budi Santoso",
      tempat_lahir: "Yogyakarta",
      tanggal_lahir: "2010-01-15",
      kelas: "IX-C",
      status_kelulusan: "TIDAK LULUS"
    },
    {
      id: "std-004",
      nisn: "5544332211",
      nama: "Dewi Lestari",
      tempat_lahir: "Wonosobo",
      tanggal_lahir: "2010-11-20",
      kelas: "IX-A",
      status_kelulusan: "LULUS"
    }
  ],
  settings: {
    announcement_time: DEFAULT_ANNOUNCEMENT_TIME,
    school_name: "SMP Negeri 1 Wonosobo",
    academic_year: "2025/2026",
    address: "Jl. Merdeka No. 12, Wonosobo, Jawa Tengah",
    phone: "(0286) 321xxx",
    email: "info@smpn1wonosobo.sch.id"
  },
  stats: {
    visitor_count: 53
  },
  admin: {
    username: "admin",
    passwordHash: hashPassword(DEFAULT_ADMIN_PASSWORD_PLAIN)
  }
};

// Ensure db.json exists or generate it
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf-8");
} else {
  // Let's ensure old database has all settings structural defaults
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    let updated = false;
    if (!parsed.admin) {
      parsed.admin = INITIAL_DB.admin;
      updated = true;
    }
    if (!parsed.stats) {
      parsed.stats = INITIAL_DB.stats;
      updated = true;
    }
    if (!parsed.settings) {
      parsed.settings = INITIAL_DB.settings;
      updated = true;
    }
    if (!parsed.students) {
      parsed.students = INITIAL_DB.students;
      updated = true;
    }
    if (updated) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), "utf-8");
    }
  } catch (err) {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), "utf-8");
  }
}

// Database helper functions for local filesystem fallback
function readDB(): DatabaseSchema {
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_DB;
  }
}

function writeDB(data: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write to local db.json fallback:", e);
  }
}

// --- SUPABASE OPTIONAL LAZY LOADER ---
let supabaseClientInstance: any = null;

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    if (!supabaseClientInstance) {
      supabaseClientInstance = createClient(url, key);
      console.log("[Supabase Config] Successfully initialized Supabase client module.");
    }
    return supabaseClientInstance;
  }
  return null;
}

// --- DATABASE REPOSITORIES ---

async function getAnnouncementSettings(): Promise<AnnouncementSettings> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("settings")
        .select("value")
        .eq("key", "announcement_settings")
        .maybeSingle();

      if (data && data.value) {
        return data.value;
      }
      // Insert default settings if it does not exist
      const defaultSettings = INITIAL_DB.settings;
      await sb.from("settings").upsert({ key: "announcement_settings", value: defaultSettings });
      return defaultSettings;
    } catch (e) {
      console.error("[Supabase Error] Failed to fetch settings, falling back to db.json:", e);
    }
  }
  return readDB().settings;
}

async function saveAnnouncementSettings(settings: AnnouncementSettings): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from("settings").upsert({ key: "announcement_settings", value: settings });
      return;
    } catch (e) {
      console.error("[Supabase Error] Failed to update settings, falling back to db.json:", e);
    }
  }
  const db = readDB();
  db.settings = settings;
  writeDB(db);
}

async function getVisitorCount(): Promise<number> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("stats")
        .select("value")
        .eq("key", "visitor_count")
        .maybeSingle();
      if (data) {
        return Number(data.value);
      }
      // Put default visitor count if not exists
      await sb.from("stats").upsert({ key: "visitor_count", value: INITIAL_DB.stats.visitor_count });
      return INITIAL_DB.stats.visitor_count;
    } catch (e) {
      console.error("[Supabase Error] Failed to fetch visitor_count, falling back to db.json:", e);
    }
  }
  return readDB().stats.visitor_count;
}

async function incrementVisitorCount(): Promise<number> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const current = await getVisitorCount();
      const updated = current + 1;
      await sb.from("stats").upsert({ key: "visitor_count", value: updated });
      return updated;
    } catch (e) {
      console.error("[Supabase Error] Failed to increment visitor count on Supabase:", e);
    }
  }
  const db = readDB();
  db.stats.visitor_count += 1;
  writeDB(db);
  return db.stats.visitor_count;
}

async function getAdminCredentials(): Promise<{ username: string; passwordHash: string }> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("admin")
        .select("username, password_hash")
        .eq("username", "admin")
        .maybeSingle();
      if (data) {
        return { username: data.username, passwordHash: data.password_hash };
      }
      // Set default admin if not exists
      const defaultAdmin = { username: INITIAL_DB.admin.username, password_hash: INITIAL_DB.admin.passwordHash };
      await sb.from("admin").upsert(defaultAdmin);
      return { username: INITIAL_DB.admin.username, passwordHash: INITIAL_DB.admin.passwordHash };
    } catch (e) {
      console.error("[Supabase Error] Failed to find admin username, falling back to db.json:", e);
    }
  }
  const db = readDB();
  return { username: db.admin.username, passwordHash: db.admin.passwordHash };
}

async function updateAdminPasswordHash(newHash: string): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from("admin").upsert({ username: "admin", password_hash: newHash });
      return;
    } catch (e) {
      console.error("[Supabase Error] Failed to update admin password on Supabase:", e);
    }
  }
  const db = readDB();
  db.admin.passwordHash = newHash;
  writeDB(db);
}

async function getStudentsList(): Promise<Siswa[]> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("students")
        .select("*")
        .order("nama", { ascending: true });
      if (data) {
        return data as Siswa[];
      }
    } catch (e) {
      console.error("[Supabase Error] Failed to list students on Supabase:", e);
    }
  }
  return readDB().students;
}

async function findStudentByCredentials(nisn: string, tanggalLahir: string): Promise<Siswa | null> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data, error } = await sb
        .from("students")
        .select("*")
        .eq("nisn", nisn.trim())
        .eq("tanggal_lahir", tanggalLahir.trim())
        .maybeSingle();
      if (data) {
        return data as Siswa;
      }
      return null;
    } catch (e) {
      console.error("[Supabase Error] Failed to find unique student with credentials:", e);
    }
  }
  const db = readDB();
  const found = db.students.find(
    s => s.nisn.trim() === nisn.trim() && s.tanggal_lahir.trim() === tanggalLahir.trim()
  );
  return found || null;
}

async function checkNisnExists(nisn: string, excludeId?: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      let query = sb.from("students")
        .select("id")
        .eq("nisn", nisn.trim());
      if (excludeId) {
        query = query.neq("id", excludeId);
      }
      const { data } = await query;
      return (data && data.length > 0) || false;
    } catch (e) {
      console.error("[Supabase Error] Failed to query check duplicate NISN:", e);
    }
  }
  const db = readDB();
  return db.students.some(s => s.nisn.trim() === nisn.trim() && s.id !== excludeId);
}

async function createStudent(siswa: Siswa): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from("students").insert(siswa);
      return;
    } catch (e) {
      console.error("[Supabase Error] Failed to insert student on Supabase info:", e);
    }
  }
  const db = readDB();
  db.students.push(siswa);
  writeDB(db);
}

async function updateStudent(id: string, siswaPayload: Partial<Siswa>): Promise<void> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      await sb.from("students").update(siswaPayload).eq("id", id);
      return;
    } catch (e) {
      console.error("[Supabase Error] Failed to update student on Supabase:", e);
    }
  }
  const db = readDB();
  const idx = db.students.findIndex(s => s.id === id);
  if (idx !== -1) {
    db.students[idx] = { ...db.students[idx], ...siswaPayload } as Siswa;
    writeDB(db);
  }
}

async function removeStudent(id: string): Promise<boolean> {
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { error } = await sb.from("students").delete().eq("id", id);
      if (!error) return true;
    } catch (e) {
      console.error("[Supabase Error] Failed to delete student on Supabase:", e);
    }
  }
  const db = readDB();
  const originalLength = db.students.length;
  db.students = db.students.filter(s => s.id !== id);
  if (db.students.length !== originalLength) {
    writeDB(db);
    return true;
  }
  return false;
}

async function bulkUpsertStudents(studentsList: any[]): Promise<{ imported: number, updated: number }> {
  const sb = getSupabaseClient();
  let imported = 0;
  let updated = 0;

  if (sb) {
    try {
      for (const s of studentsList) {
        if (!s.nisn || !s.nama || !s.tanggal_lahir) {
          continue;
        }
        const rawNISN = String(s.nisn).trim();
        const rawBirth = String(s.tanggal_lahir).trim(); // YYYY-MM-DD
        const rawStatus = String(s.status_kelulusan || "LULUS").toUpperCase().includes("TIDAK") ? "TIDAK LULUS" : "LULUS";
        
        // Check if student exists by NISN
        const { data: existing } = await sb.from("students").select("id").eq("nisn", rawNISN).maybeSingle();
        const studentId = existing?.id || ("std-" + crypto.randomBytes(8).toString("hex"));

        const payload = {
          id: studentId,
          nisn: rawNISN,
          nama: String(s.nama).trim(),
          tempat_lahir: String(s.tempat_lahir || "Wonosobo").trim(),
          tanggal_lahir: rawBirth,
          kelas: String(s.kelas || "IX-A").trim(),
          status_kelulusan: rawStatus,
          updated_at: new Date().toISOString(),
          ...(existing ? {} : { created_at: new Date().toISOString() })
        };

        const { error } = await sb.from("students").upsert(payload);
        if (!error) {
          if (existing) {
            updated++;
          } else {
            imported++;
          }
        }
      }
      return { imported, updated };
    } catch (e) {
      console.error("[Supabase Error] Bulk import failed, falling back to local storage:", e);
    }
  }

  // Local static file DB fallback
  const db = readDB();
  for (const s of studentsList) {
    if (!s.nisn || !s.nama || !s.tanggal_lahir) {
      continue;
    }
    const rawNISN = String(s.nisn).trim();
    const rawBirth = String(s.tanggal_lahir).trim();
    const rawStatus = String(s.status_kelulusan || "LULUS").toUpperCase().includes("TIDAK") ? "TIDAK LULUS" : "LULUS";

    const idx = db.students.findIndex(p => p.nisn === rawNISN);
    if (idx !== -1) {
      db.students[idx] = {
        ...db.students[idx],
        nama: String(s.nama).trim(),
        tempat_lahir: String(s.tempat_lahir || "Wonosobo").trim(),
        tanggal_lahir: rawBirth,
        kelas: String(s.kelas || "IX-A").trim(),
        status_kelulusan: rawStatus,
        updated_at: new Date().toISOString()
      };
      updated++;
    } else {
      db.students.push({
        id: "std-" + crypto.randomBytes(8).toString("hex"),
        nisn: rawNISN,
        nama: String(s.nama).trim(),
        tempat_lahir: String(s.tempat_lahir || "Wonosobo").trim(),
        tanggal_lahir: rawBirth,
        kelas: String(s.kelas || "IX-A").trim(),
        status_kelulusan: rawStatus,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      imported++;
    }
  }
  writeDB(db);
  return { imported, updated };
}

// Active login sessions
const activeSessions = new Map<string, { username: string; expiresAt: number }>();

const app = express();
app.use(express.json({ limit: "50mb" })); // Increase limit for potential large excel payloads

// Simple In-memory rate limiter for search queries to protect student data
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // Max 15 attempts per minute

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hit = rateLimitMap.get(ip);
  if (!hit) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - hit.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  hit.count += 1;
  if (hit.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// --- API ROUTES ---

// 1. Get Public Settings
app.get("/api/public/settings", async (req, res) => {
  const settings = await getAnnouncementSettings();
  const now = new Date();
  const releaseTime = new Date(settings.announcement_time);
  const isReleased = now.getTime() >= releaseTime.getTime();

  res.json({
    success: true,
    data: {
      school_name: settings.school_name,
      academic_year: settings.academic_year,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      announcement_time: settings.announcement_time,
      is_released: isReleased,
      current_time: now.toISOString()
    }
  });
});

// 2. Increment visitor count (Triggers on Landing Page load)
app.post("/api/public/increment-visitors", async (req, res) => {
  const updatedCount = await incrementVisitorCount();
  res.json({
    success: true,
    visitor_count: updatedCount
  });
});

// 3. Search Student (Cek Kelulusan)
app.post("/api/public/cek-kelulusan", async (req, res) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown_ip";
  if (isRateLimited(String(ip))) {
    return res.status(429).json({
      success: false,
      message: "Terlalu banyak permintaan log masuk. Silakan coba lagi setelah 1 menit."
    });
  }

  const { nisn, tanggal_lahir } = req.body;

  if (!nisn || !tanggal_lahir) {
    return res.status(400).json({
      success: false,
      message: "NISN dan Tanggal Lahir harus diisi!"
    });
  }

  const settings = await getAnnouncementSettings();
  const now = new Date();
  const releaseTime = new Date(settings.announcement_time);
  const isReleased = now.getTime() >= releaseTime.getTime();

  if (!isReleased) {
    return res.status(403).json({
      success: false,
      message: "Pengumuman belum dirilis! Silakan pantau sisa waktu hitung mundur."
    });
  }

  // Standardize input format
  const cleanedNISN = String(nisn || "").trim();
  const cleanedBirthDate = String(tanggal_lahir || "").trim(); // Should match YYYY-MM-DD

  // Find siswa
  const siswaData = await findStudentByCredentials(cleanedNISN, cleanedBirthDate);

  if (!siswaData) {
    return res.status(404).json({
      success: false,
      message: "Data tidak ditemukan. Silakan periksa kembali NISN dan Tanggal Lahir Anda."
    });
  }

  res.json({
    success: true,
    data: siswaData
  });
});

// 4. Admin Login
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Username dan password wajib diisi."
    });
  }

  const adminCredentials = await getAdminCredentials();
  const inputHash = hashPassword(password);

  if (adminCredentials.username === username && adminCredentials.passwordHash === inputHash) {
    // Generate standard random session token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 1000 * 60 * 60 * 4; // 4 Hours stability
    activeSessions.set(token, { username, expiresAt });

    return res.json({
      success: true,
      message: "Login berhasil",
      token
    });
  } else {
    return res.status(401).json({
      success: false,
      message: "Username atau password salah!"
    });
  }
});

// --- ADMIN MIDDLEWARE ---
function authenticateAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Akses ditolak. Sesi tidak ditemukan atau kedaluwarsa."
    });
  }

  const token = authHeader.split(" ")[1];
  const session = activeSessions.get(token);

  if (!session || Date.now() > session.expiresAt) {
    if (session) activeSessions.delete(token); // Clean expired
    return res.status(401).json({
      success: false,
      message: "Sesi Anda telah berakhir. Silakan login kembali."
    });
  }

  // Extend expiration
  session.expiresAt = Date.now() + 1000 * 60 * 60 * 4;
  next();
}

// 5. Get admin settings and statistics
app.get("/api/admin/dashboard-stats", authenticateAdmin, async (req, res) => {
  const settings = await getAnnouncementSettings();
  const students = await getStudentsList();
  const visitors = await getVisitorCount();
  
  const countLulus = students.filter(s => s.status_kelulusan === "LULUS").length;
  const countTidakLulus = students.filter(s => s.status_kelulusan === "TIDAK LULUS").length;

  res.json({
    success: true,
    data: {
      settings: settings,
      stats: {
        visitor_count: visitors,
        total_students: students.length,
        lulus_count: countLulus,
        tidak_lulus_count: countTidakLulus
      }
    }
  });
});

// 6. Get All Students (Siswa)
app.get("/api/admin/siswa", authenticateAdmin, async (req, res) => {
  const list = await getStudentsList();
  res.json({
    success: true,
    data: list
  });
});

// 7. Add Student (Siswa)
app.post("/api/admin/siswa", authenticateAdmin, async (req, res) => {
  const { nisn, nama, tempat_lahir, tanggal_lahir, kelas, status_kelulusan } = req.body;

  if (!nisn || !nama || !tempat_lahir || !tanggal_lahir || !kelas || !status_kelulusan) {
    return res.status(400).json({
      success: false,
      message: "Seluruh kolom data siswa wajib diisi!"
    });
  }

  // Check duplicate NISN
  const cleanedNISN = String(nisn).trim();
  const exists = await checkNisnExists(cleanedNISN);
  if (exists) {
    return res.status(400).json({
      success: false,
      message: `Siswa dengan NISN ${cleanedNISN} sudah terdaftar!`
    });
  }

  const newSiswa: Siswa = {
    id: "std-" + crypto.randomBytes(8).toString("hex"),
    nisn: cleanedNISN,
    nama: String(nama).trim(),
    tempat_lahir: String(tempat_lahir).trim(),
    tanggal_lahir: String(tanggal_lahir).trim(),
    kelas: String(kelas).trim(),
    status_kelulusan: status_kelulusan === "LULUS" ? "LULUS" : "TIDAK LULUS",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  await createStudent(newSiswa);

  res.json({
    success: true,
    message: "Data siswa berhasil ditambahkan",
    data: newSiswa
  });
});

// 8. Update Student (Siswa)
app.put("/api/admin/siswa/:id", authenticateAdmin, async (req, res) => {
  const id = req.params.id;
  const { nisn, nama, tempat_lahir, tanggal_lahir, kelas, status_kelulusan } = req.body;

  if (!nisn || !nama || !tempat_lahir || !tanggal_lahir || !kelas || !status_kelulusan) {
    return res.status(400).json({
      success: false,
      message: "Seluruh kolom data siswa wajib diisi!"
    });
  }

  // Check NISN duplicate if changed
  const cleanedNISN = String(nisn).trim();
  const exists = await checkNisnExists(cleanedNISN, id);
  if (exists) {
    return res.status(400).json({
      success: false,
      message: `Siswa dengan NISN ${cleanedNISN} sudah terdaftar!`
    });
  }

  const payload: Partial<Siswa> = {
    nisn: cleanedNISN,
    nama: String(nama).trim(),
    tempat_lahir: String(tempat_lahir).trim(),
    tanggal_lahir: String(tanggal_lahir).trim(),
    kelas: String(kelas).trim(),
    status_kelulusan: status_kelulusan === "LULUS" ? "LULUS" : "TIDAK LULUS",
    updated_at: new Date().toISOString()
  };

  await updateStudent(id, payload);

  res.json({
    success: true,
    message: "Data siswa Berhasil diperbarui",
    data: { id, ...payload }
  });
});

// 9. Delete Student (Siswa)
app.delete("/api/admin/siswa/:id", authenticateAdmin, async (req, res) => {
  const id = req.params.id;
  const deleted = await removeStudent(id);

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Siswa tidak ditemukan!"
    });
  }

  res.json({
    success: true,
    message: "Data siswa berhasil dihapus"
  });
});

// 10. Bulk Import Students (Siswa)
app.post("/api/admin/siswa/import", authenticateAdmin, async (req, res) => {
  const { students } = req.body; // Expecting array of Siswa (without ID)

  if (!Array.isArray(students) || students.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Payload harus berupa data siswa berkas array yang valid."
    });
  }

  const results = await bulkUpsertStudents(students);

  res.json({
    success: true,
    message: `Impor selesai. Berhasil menambahkan ${results.imported} siswa baru dan memperbarui ${results.updated} data siswa.`
  });
});

// 11. Update Admin Settings (School Details, Release Time)
app.put("/api/admin/settings", authenticateAdmin, async (req, res) => {
  const { school_name, academic_year, address, phone, email, announcement_time } = req.body;

  if (!school_name || !academic_year || !address || !phone || !email || !announcement_time) {
    return res.status(400).json({
      success: false,
      message: "Seluruh kolom konfigurasi sekolah wajib diisi!"
    });
  }

  const payload = {
    school_name: String(school_name).trim(),
    academic_year: String(academic_year).trim(),
    address: String(address).trim(),
    phone: String(phone).trim(),
    email: String(email).trim(),
    announcement_time: String(announcement_time).trim()
  };

  await saveAnnouncementSettings(payload);

  res.json({
    success: true,
    message: "Pengaturan pengumuman berhasil disimpan!",
    data: payload
  });
});

// 12. Change Admin Password
app.post("/api/admin/change-password", authenticateAdmin, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Sandi lama dan sandi baru wajib diisi."
    });
  }

  const adminCredentials = await getAdminCredentials();
  const oldHash = hashPassword(oldPassword);

  if (adminCredentials.passwordHash !== oldHash) {
    return res.status(400).json({
      success: false,
      message: "Sandi lama yang Anda masukkan salah!"
    });
  }

  await updateAdminPasswordHash(hashPassword(newPassword));

  res.json({
    success: true,
    message: "Kata sandi admin berhasil diperbarui!"
  });
});

// 13. Verify Token
app.post("/api/admin/verify-token", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: "Token wajib diisi." });
  }
  const session = activeSessions.get(token);
  if (!session || Date.now() > session.expiresAt) {
    if (session) activeSessions.delete(token);
    return res.json({ success: false, message: "Token tidak valid atau telah kedaluwarsa." });
  }
  res.json({ success: true, username: session.username });
});

// Export the app for serverless platforms like Vercel
export default app;

// --- LISTEN / RUN LOGIC ONLY IF NOT DEPLOYED TO VERCEL ---
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  const PORT = 3000;
  if (process.env.NODE_ENV !== "production") {
    createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    }).then((vite) => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`[Announcements Fullstack] Dev server listening on http://0.0.0.0:${PORT}`);
      });
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Announcements Fullstack] Production server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

