const express = require('express');
const yol = require('path');

const uygulama = express();

const SUNUCU_PORTU = 3000;
const FRONTEND_KLASORU = yol.join(__dirname, '..', 'frontend');

// Geçici ürün deposu (bellek içi)
const products = [];

uygulama.use(express.json());
uygulama.use(express.static(FRONTEND_KLASORU));

uygulama.get('/', (istek, yanit) => {
  yanit.sendFile(yol.join(FRONTEND_KLASORU, 'index.html'));
});

uygulama.get('/api/products', (istek, yanit) => {
  yanit.json({ basarili: true, urunler: products });
});

uygulama.post('/api/products', (istek, yanit) => {
  const urunAdi = istek.body.urunAdi?.trim();
  const kategori = istek.body.kategori?.trim();
  const stokAdedi = istek.body.stokAdedi;
  const birimFiyati = istek.body.birimFiyati;

  if (!urunAdi || !kategori || stokAdedi === undefined || stokAdedi === null || stokAdedi === '') {
    return yanit.status(400).json({
      basarili: false,
      mesaj: 'Ürün Adı, Kategori ve Stok Adedi alanları zorunludur.',
    });
  }

  const eklenecekMiktar = Number(stokAdedi);

  if (isNaN(eklenecekMiktar) || eklenecekMiktar < 0) {
    return yanit.status(400).json({
      basarili: false,
      mesaj: 'Stok Adedi geçerli bir sayı olmalıdır.',
    });
  }

  const mevcutUrun = products.find(
    (urun) => urun.urunAdi.toLowerCase() === urunAdi.toLowerCase()
  );

  if (mevcutUrun) {
    mevcutUrun.stokAdedi += eklenecekMiktar;
    return yanit.json({
      basarili: true,
      mesaj: 'Ürün zaten mevcut. Stok adedi güncellendi.',
      urun: mevcutUrun,
      mukerrer: true,
    });
  }

  if (birimFiyati === undefined || birimFiyati === null || birimFiyati === '') {
    return yanit.status(400).json({
      basarili: false,
      mesaj: 'Yeni ürün eklerken Birim Fiyatı zorunludur.',
    });
  }

  const yeniUrun = {
    id: Date.now(),
    urunAdi,
    kategori,
    stokAdedi: eklenecekMiktar,
    birimFiyati: Number(birimFiyati),
  };

  products.push(yeniUrun);

  yanit.status(201).json({
    basarili: true,
    mesaj: 'Ürün başarıyla eklendi.',
    urun: yeniUrun,
    mukerrer: false,
  });
});

uygulama.put('/api/products/:id', (istek, yanit) => {
  const urunId = Number(istek.params.id);
  const urunIndeksi = products.findIndex((urun) => urun.id === urunId);

  if (urunIndeksi === -1) {
    return yanit.status(404).json({ basarili: false, mesaj: 'Ürün bulunamadı.' });
  }

  const { urunAdi, kategori, stokAdedi, birimFiyati } = istek.body;

  if (urunAdi !== undefined) products[urunIndeksi].urunAdi = urunAdi;
  if (kategori !== undefined) products[urunIndeksi].kategori = kategori;
  if (stokAdedi !== undefined) products[urunIndeksi].stokAdedi = Number(stokAdedi);
  if (birimFiyati !== undefined) products[urunIndeksi].birimFiyati = Number(birimFiyati);

  yanit.json({
    basarili: true,
    mesaj: 'Ürün başarıyla güncellendi.',
    urun: products[urunIndeksi],
  });
});

uygulama.delete('/api/products/:id', (istek, yanit) => {
  const urunId = Number(istek.params.id);
  const urunIndeksi = products.findIndex((urun) => urun.id === urunId);

  if (urunIndeksi === -1) {
    return yanit.status(404).json({ basarili: false, mesaj: 'Ürün bulunamadı.' });
  }

  products.splice(urunIndeksi, 1);

  yanit.json({ basarili: true, mesaj: 'Ürün başarıyla silindi.' });
});

uygulama.listen(SUNUCU_PORTU, () => {
  console.log('Kaanlar Gıda Stok Sunucusu 3000 portunda çalışıyor');
});
