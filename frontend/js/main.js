/**
 * Kaanlar Gıda - Stok Takip Sistemi (Frontend)
 * Gün 13: KPI Kartları ve Tam Entegrasyon
 */

const URUN_EKLE_FORMU = document.getElementById('urun-ekle-formu');
const STOK_TABLOSU_GOVDE = document.getElementById('stok-tablosu-govde');
const URUN_SAYISI_ELEMENTI = document.getElementById('urun-sayisi');
const FORM_GONDER_BUTONU = document.getElementById('form-gonder-btn');
const ARAMA_INPUT = document.getElementById('search-input');
const KATEGORI_FILTRE = document.getElementById('category-filter');

// 13. Gün: KPI Kart Elemanları
const KPI_TOPLAM_URUN = document.getElementById('kpi-toplam-urun');
const KPI_DEPO_DEGERI = document.getElementById('kpi-depo-degeri');
const KPI_KRITIK_STOK = document.getElementById('kpi-kritik-stok');

const API_URUNLER = '/api/products';

let duzenlenenUrunId = null;
let tumUrunler = [];

function paraFormatla(tutar) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
  }).format(tutar);
}

function urunSayisiniGuncelle(adet) {
  const metin = adet === 1 ? '1 ürün' : `${adet} ürün`;
  if (URUN_SAYISI_ELEMENTI) URUN_SAYISI_ELEMENTI.textContent = metin;
}

function kpiKartlariniGuncelle(urunler) {
  if (KPI_TOPLAM_URUN) KPI_TOPLAM_URUN.textContent = urunler.length;

  if (KPI_DEPO_DEGERI) {
    const toplamVal = urunler.reduce((toplam, u) => toplam + (u.stokAdedi * u.birimFiyati), 0);
    KPI_DEPO_DEGERI.textContent = paraFormatla(toplamVal);
  }

  if (KPI_KRITIK_STOK) {
    const kritikSayi = urunler.filter((u) => u.stokAdedi < 5).length;
    KPI_KRITIK_STOK.textContent = kritikSayi;
  }
}

function formModunuSifirla() {
  duzenlenenUrunId = null;
  URUN_EKLE_FORMU.reset();
  FORM_GONDER_BUTONU.textContent = 'Ekle';
}

function kategoriSecenekleriniGuncelle() {
  const seciliKategori = KATEGORI_FILTRE.value;
  const kategoriler = [...new Set(tumUrunler.map((urun) => urun.kategori))].sort();

  KATEGORI_FILTRE.innerHTML = '<option value="">Tüm Kategoriler</option>';

  kategoriler.forEach((kategori) => {
    const secenek = document.createElement('option');
    secenek.value = kategori;
    secenek.textContent = kategori;
    KATEGORI_FILTRE.appendChild(secenek);
  });

  KATEGORI_FILTRE.value = kategoriler.includes(seciliKategori) ? seciliKategori : '';
}

function urunleriFiltrele() {
  const aramaMetni = ARAMA_INPUT.value.trim().toLowerCase();
  const seciliKategori = KATEGORI_FILTRE.value;

  return tumUrunler.filter((product) => {
    const kategoriEslesmesi = !seciliKategori || product.kategori === seciliKategori;
    const aramaEslesmesi =
      !aramaMetni ||
      product.urunAdi.toLowerCase().includes(aramaMetni) ||
      product.kategori.toLowerCase().includes(aramaMetni);

    return kategoriEslesmesi && aramaEslesmesi;
  });
}

function tabloyuOlustur(urunler) {
  STOK_TABLOSU_GOVDE.innerHTML = '';

  if (urunler.length === 0) {
    const bosMesaj = tumUrunler.length === 0
      ? 'Henüz ürün eklenmedi.'
      : 'Filtreye uygun ürün bulunamadı.';

    STOK_TABLOSU_GOVDE.innerHTML = `
      <tr class="bos-satir">
        <td colspan="7">${bosMesaj}</td>
      </tr>
    `;
    urunSayisiniGuncelle(0);
    return;
  }

  urunler.forEach((product, indeks) => {
    const toplamDeger = product.stokAdedi * product.birimFiyati;

    const satir = document.createElement('tr');
    satir.innerHTML = `
      <td>${indeks + 1}</td>
      <td><strong>${product.urunAdi}</strong></td>
      <td>${product.kategori}</td>
      <td>${product.stokAdedi}</td>
      <td>${paraFormatla(product.birimFiyati)}</td>
      <td>${paraFormatla(toplamDeger)}</td>
      <td class="islem-hucre">
        <button type="button" class="btn btn--duzenle" data-id="${product.id}">Düzenle</button>
        <button type="button" class="btn btn--sil" data-id="${product.id}">Sil</button>
      </td>
    `;

    STOK_TABLOSU_GOVDE.appendChild(satir);
  });

  urunSayisiniGuncelle(urunler.length);
}

function filtreUygulaVeTabloyuCiz() {
  const filtrelenmisUrunler = urunleriFiltrele();
  tabloyuOlustur(filtrelenmisUrunler);
  kpiKartlariniGuncelle(tumUrunler);
}

async function urunleriGetir() {
  const yanit = await fetch(API_URUNLER);
  const veri = await yanit.json();

  if (!yanit.ok || !veri.basarili) {
    throw new Error(veri.mesaj || 'Ürünler alınamadı.');
  }

  return veri.urunler;
}

async function tabloyuYenile() {
  tumUrunler = await urunleriGetir();
  kategoriSecenekleriniGuncelle();
  filtreUygulaVeTabloyuCiz();
}

async function urunSil(urunId) {
  const onay = confirm('Bu ürünü silmek istediğinize emin misiniz?');
  if (!onay) return;

  const yanit = await fetch(`${API_URUNLER}/${urunId}`, {
    method: 'DELETE',
  });

  const veri = await yanit.json();

  if (!yanit.ok || !veri.basarili) {
    throw new Error(veri.mesaj || 'Ürün silinemedi.');
  }

  if (Number(duzenlenenUrunId) === Number(urunId)) {
    formModunuSifirla();
  }

  await tabloyuYenile();
}

function urunDuzenleFormaYukle(urunId) {
  const product = tumUrunler.find((urun) => urun.id === Number(urunId));
  if (!product) return;

  duzenlenenUrunId = product.id;
  document.getElementById('urun-adi').value = product.urunAdi;
  document.getElementById('kategori').value = product.kategori;
  document.getElementById('stok-adedi').value = product.stokAdedi;
  document.getElementById('birim-fiyati').value = product.birimFiyati;
  FORM_GONDER_BUTONU.textContent = 'Güncelle';
  document.getElementById('urun-adi').focus();
}

async function formuIsle(olay) {
  olay.preventDefault();

  const urunAdi = document.getElementById('urun-adi').value.trim();
  const kategori = document.getElementById('kategori').value.trim();
  const stokAdedi = document.getElementById('stok-adedi').value;
  const birimFiyati = document.getElementById('birim-fiyati').value;

  if (!urunAdi || !kategori || stokAdedi === '') {
    alert('Ürün Adı, Kategori ve Stok Adedi alanları zorunludur.');
    return;
  }

  const urunVerisi = {
    urunAdi,
    kategori,
    stokAdedi: Number(stokAdedi),
    birimFiyati: Number(birimFiyati),
  };

  try {
    let yanit;

    if (duzenlenenUrunId) {
      yanit = await fetch(`${API_URUNLER}/${duzenlenenUrunId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urunVerisi),
      });
    } else {
      yanit = await fetch(API_URUNLER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(urunVerisi),
      });
    }

    const veri = await yanit.json();

    if (!yanit.ok || !veri.basarili) {
      alert(veri.mesaj || 'İşlem sırasında bir hata oluştu.');
      return;
    }

    await tabloyuYenile();
    formModunuSifirla();
  } catch (hata) {
    console.error('Form gönderim hatası:', hata);
    alert('Sunucuya bağlanılamadı. Sunucunun çalıştığından emin olun.');
  }
}

function tabloTiklamaIsle(olay) {
  const silButonu = olay.target.closest('.btn--sil');
  if (silButonu) {
    urunSil(silButonu.dataset.id).catch((hata) => {
      console.error('Silme hatası:', hata);
      alert(hata.message || 'Ürün silinirken bir hata oluştu.');
    });
    return;
  }

  const duzenleButonu = olay.target.closest('.btn--duzenle');
  if (duzenleButonu) {
    urunDuzenleFormaYukle(duzenleButonu.dataset.id);
  }
}

function filtreOlaylariniBaslat() {
  if (ARAMA_INPUT) ARAMA_INPUT.addEventListener('input', filtreUygulaVeTabloyuCiz);
  if (KATEGORI_FILTRE) KATEGORI_FILTRE.addEventListener('change', filtreUygulaVeTabloyuCiz);
}

URUN_EKLE_FORMU.addEventListener('submit', formuIsle);
STOK_TABLOSU_GOVDE.addEventListener('click', tabloTiklamaIsle);

document.addEventListener('DOMContentLoaded', () => {
  filtreOlaylariniBaslat();
  tabloyuYenile().catch((hata) => {
    console.error('Ürün listesi yüklenemedi:', hata);
  });
});