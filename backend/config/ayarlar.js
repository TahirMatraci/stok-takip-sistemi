/**
 * Uygulama genel ayarları
 */
const AYARLAR = {
  sunucuPortu: process.env.PORT || 3000,
  projeAdi: 'Kaanlar Gıda - Depo Stok & Görev Yönetimi',
  sirketAdi: 'Kaanlar Gıda A.Ş.',
  ortam: process.env.NODE_ENV || 'gelistirme',
};

module.exports = AYARLAR;
