/**
 * Kaanlar Gıda - Depo Stok & Lojistik Takip Sistemi (Backend)
 * Gün 17: Tam Ekipmanlı REST API (Ürün & Sevkiyat Modülleri)
 */

const express = require('express');
const path = require('path');
const db = require('./data/database');

const uygulama = express();
const SUNUCU_PORTU = 3000;
const FRONTEND_KLASORU = path.join(__dirname, 'frontend');

// Body Parser Middleware
uygulama.use(express.json());
uygulama.use(express.urlencoded({ extended: true }));

// Statik Dosyalar (HTML, CSS, JS)
uygulama.use(express.static(FRONTEND_KLASORU));

/* ==================== ÜRÜN (PRODUCTS) API ==================== */

// GET: Tüm Ürünleri Getir
uygulama.get('/api/products', (istek, yanit) => {
  const sql = 'SELECT * FROM products ORDER BY id DESC';
  db.all(sql, [], (err, rows) => {
    if (err) return yanit.status(500).json({ basarili: false, mesaj: err.message });
    yanit.json({ basarili: true, urunler: rows || [] });
  });
});

// POST: Yeni Ürün Ekle
uygulama.post('/api/products', (istek, yanit) => {
  const urunAdi = istek.body.urunAdi?.trim();
  const kategori = istek.body.kategori?.trim();
  const stokAdedi = Number(istek.body.stokAdedi);
  const birimFiyati = Number(istek.body.birimFiyati);

  if (!urunAdi || !kategori || isNaN(stokAdedi) || isNaN(birimFiyati)) {
    return yanit.status(400).json({ basarili: false, mesaj: 'Lütfen tüm alanları geçerli değerlerle doldurun.' });
  }

  const kontrolSql = 'SELECT * FROM products WHERE LOWER(urunAdi) = LOWER(?)';
  db.get(kontrolSql, [urunAdi], (err, mevcutUrun) => {
    if (err) return yanit.status(500).json({ basarili: false, mesaj: err.message });

    if (mevcutUrun) {
      const yeniStok = mevcutUrun.stokAdedi + stokAdedi;
      db.run('UPDATE products SET stokAdedi = ? WHERE id = ?', [yeniStok, mevcutUrun.id], (updateErr) => {
        if (updateErr) return yanit.status(500).json({ basarili: false, mesaj: updateErr.message });
        yanit.json({ basarili: true, mesaj: 'Mevcut ürünün stok adedi güncellendi.', mukerrer: true });
      });
    } else {
      const ekleSql = 'INSERT INTO products (urunAdi, kategori, stokAdedi, birimFiyati) VALUES (?, ?, ?, ?)';
      db.run(ekleSql, [urunAdi, kategori, stokAdedi, birimFiyati], function (insertErr) {
        if (insertErr) return yanit.status(500).json({ basarili: false, mesaj: insertErr.message });
        yanit.status(201).json({
          basarili: true,
          mesaj: 'Ürün eklendi.',
          urun: { id: this.lastID, urunAdi, kategori, stokAdedi, birimFiyati },
          mukerrer: false
        });
      });
    }
  });
});

/* ==================== SEVKİYAT (SHIPMENTS) API ==================== */

// GET: Sevkiyat Listesi (SQL JOIN)
uygulama.get('/api/shipments', (istek, yanit) => {
  const sql = `
    SELECT s.id, s.urunId, p.urunAdi, s.sevkiyatTuru, s.miktar, s.lokasyon, s.tarih 
    FROM shipments s
    LEFT JOIN products p ON s.urunId = p.id
    ORDER BY s.id DESC
  `;
  db.all(sql, [], (err, rows) => {
    if (err) return yanit.status(500).json({ basarili: false, mesaj: err.message });
    yanit.json({ basarili: true, sevkiyatlar: rows || [] });
  });
});

// POST: Yeni Sevkiyat Kaydı (Stok Kontrolü + Otomatik Stok Güncelleme)
uygulama.post('/api/shipments', (istek, yanit) => {
  const urunId = Number(istek.body.urunId);
  const sevkiyatTuru = istek.body.sevkiyatTuru;
  const miktar = Number(istek.body.miktar);
  const lokasyon = istek.body.lokasyon?.trim();

  if (!urunId || !sevkiyatTuru || !lokasyon || isNaN(miktar) || miktar <= 0) {
    return yanit.status(400).json({ basarili: false, mesaj: 'Lütfen tüm alanları eksiksiz doldurun.' });
  }

  // Ürün ve stok durumunu sorgula
  db.get('SELECT * FROM products WHERE id = ?', [urunId], (err, urun) => {
    if (err) return yanit.status(500).json({ basarili: false, mesaj: 'Veri tabanı hatası: ' + err.message });
    if (!urun) return yanit.status(404).json({ basarili: false, mesaj: 'Seçilen ürün bulunamadı.' });

    let yeniStok = urun.stokAdedi;

    if (sevkiyatTuru === 'GIDEN') {
      if (miktar > urun.stokAdedi) {
        return yanit.status(400).json({
          basarili: false,
          mesaj: `Yetersiz Stok! Depoda yalnızca ${urun.stokAdedi} adet '${urun.urunAdi}' mevcuttur.`
        });
      }
      yeniStok = urun.stokAdedi - miktar;
    } else if (sevkiyatTuru === 'GELEN') {
      yeniStok = urun.stokAdedi + miktar;
    }

    // Sevkiyat kaydını at
    const ekleSql = 'INSERT INTO shipments (urunId, sevkiyatTuru, miktar, lokasyon) VALUES (?, ?, ?, ?)';
    db.run(ekleSql, [urunId, sevkiyatTuru, miktar, lokasyon], function (insertErr) {
      if (insertErr) return yanit.status(500).json({ basarili: false, mesaj: insertErr.message });

      // Stok miktarını otomatik güncelle
      db.run('UPDATE products SET stokAdedi = ? WHERE id = ?', [yeniStok, urunId], (updateErr) => {
        if (updateErr) return yanit.status(500).json({ basarili: false, mesaj: updateErr.message });

        yanit.status(201).json({
          basarili: true,
          mesaj: `Sevkiyat kaydedildi. Güncel Stok: ${yeniStok} adet.`
        });
      });
    });
  });
});

// Tanımlanmayan API Rotaları için JSON Hatası Dön (HTML Dönmesini Engeller)
uygulama.use('/api/*', (istek, yanit) => {
  yanit.status(404).json({ basarili: false, mesaj: 'İstenen API ucu bulunamadı.' });
});

// Sayfa Yönlendirmeleri
uygulama.get('/', (istek, yanit) => {
  yanit.sendFile(path.join(FRONTEND_KLASORU, 'index.html'));
});

// Sunucuyu Başlat
uygulama.listen(SUNUCU_PORTU, '0.0.0.0', () => {
  console.log(`Kaanlar Gıda Stok Sunucusu http://localhost:${SUNUCU_PORTU} adresinde çalışıyor...`);
});