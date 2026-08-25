import { DatabaseSync } from 'node:sqlite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DB_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'cubbycare.db')

export const db = new DatabaseSync(DB_PATH)

db.exec(`
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS providers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL CHECK (type IN ('individual','center')),
    name TEXT NOT NULL,
    bio TEXT NOT NULL DEFAULT '',
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    neighborhood TEXT NOT NULL,
    address TEXT NOT NULL DEFAULT '',
    price_hint TEXT NOT NULL DEFAULT '',
    capacity INTEGER NOT NULL DEFAULT 1,
    verified_tier INTEGER NOT NULL DEFAULT 0,
    avatar TEXT NOT NULL DEFAULT '🧸',
    languages TEXT NOT NULL DEFAULT '["English"]',
    amenities TEXT NOT NULL DEFAULT '[]',
    age_bands TEXT NOT NULL DEFAULT '[]',
    weekly_availability TEXT NOT NULL DEFAULT '{}',
    spots_available INTEGER NOT NULL DEFAULT 0,
    review_summary TEXT,
    license_number TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id),
    kind TEXT NOT NULL,
    issuer TEXT NOT NULL DEFAULT '',
    details TEXT NOT NULL DEFAULT '',
    expiry TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS booking_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id),
    parent_name TEXT NOT NULL,
    child_age_months INTEGER NOT NULL,
    date TEXT NOT NULL,
    slot TEXT NOT NULL DEFAULT 'am',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','declined')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id INTEGER NOT NULL REFERENCES providers(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    text TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`)

export const AMENITIES = [
  'meals_breakfast',
  'meals_lunch',
  'playground_outdoor',
  'nap_room',
  'arts',
  'music',
  'stem',
  'pickup_dropoff',
  'nut_free',
] as const

export const AGE_BANDS = ['infant', 'toddler', 'preschool', 'school_age'] as const
// infant: 6-18mo · toddler: 18mo-3y · preschool: 3-5y · school_age: 5-10y

export function ageBandForMonths(months: number): (typeof AGE_BANDS)[number] | null {
  if (months < 6 || months > 120) return null
  if (months < 18) return 'infant'
  if (months < 36) return 'toddler'
  if (months < 60) return 'preschool'
  return 'school_age'
}
