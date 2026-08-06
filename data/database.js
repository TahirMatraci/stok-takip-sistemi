/**
 * Kaanlar Gıda - Veri Tabanı Bağlantı ve Tablo Kurulum Modülü
 * Gün 16: Shipments (Sevkiyatlar) Tablosu ve Foreign Key İlişkisi
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'kaanlar_depo.db');

// Veri Tabanı Bağlantısı
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Veri tabanı bağlantı hatası:', err.message);
  } else {
    console.log('SQLite Veri Tabanına başarıyla bağlanıldı.');
  }
});

// Foreign Key Desteğini Aktif Et ve Tabloları Oluştur
db.serialize(() => {
  db.run('PRAGMA foreign_keys = ON');

  // Products (Ürünler) Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urunAdi TEXT NOT NULL,
      kategori TEXT NOT NULL,
      stokAdedi INTEGER NOT NULL DEFAULT 0,
      birimFiyati REAL NOT NULL DEFAULT 0.0,
      olusturmaTarihi DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Shipments (Sevkiyatlar) Tablosu
  db.run(`
    CREATE TABLE IF NOT EXISTS shipments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      urunId INTEGER NOT NULL,
      sevkiyatTuru TEXT NOT NULL,
      miktar INTEGER NOT NULL,
      lokasyon TEXT NOT NULL,
      tarih DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (urunId) REFERENCES products (id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Shipments tablosu oluşturulamadı:', err.message);
    } else {
      console.log('Shipments (Sevkiyatlar) tablosu hazır.');
    }
  });
});

module.exports = db;