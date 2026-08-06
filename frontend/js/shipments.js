/**
 * Kaanlar Gıda - Lojistik ve Sevkiyat Modülü (Frontend)
 * Gün 19: Toast Bildirim Mantığı ve UI/UX İyileştirmeleri
 */

const URUN_SECIM_KUTUSU = document.getElementById('urun-secim');
const SEVKIYAT_KAYIT_FORMU = document.getElementById('sevkiyat-formu');
const SEVKIYAT_TABLO_GOVDE = document.getElementById('sevkiyat-tablosu-govde');
const BTN_KAYDET = document.getElementById('btn-sevkiyat-kaydet');

const KPI_TOPLAM_SEVKIYAT = document.getElementById('kpi-toplam-sevkiyat');
const KPI_GELEN_MIKTAR = document.getElementById('kpi-gelen-miktar');
const KPI_GIDEN_MIKTAR = document.getElementById('kpi-giden-miktar');

// Dinamik Toast Bildirim Fonksiyonu
function bildirimGoster(mesaj, tur = 'basarili') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${tur}`;
  toast.innerHTML = `<span>${mesaj}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease-out reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Depodaki ürünleri açılır menüye getir
async function urunSecenekleriniYukle() {
  try {
    const yanit = await fetch('/api/products');
    const veri = await yanit.json();

    if (veri.basarili) {
      URUN_SECIM_KUTUSU.innerHTML = '<option value="">Ürün Seçiniz...</option>';
      veri.urunler.forEach((urun) => {
        const secenek = document.createElement('option');
        secenek.value = urun.id;
        secenek.textContent = `${urun.urunAdi} (Mevcut Stok: ${urun.stokAdedi})`;
        URUN_SECIM_KUTUSU.appendChild(secenek);
      });
    }
  } catch (hata) {
    console.error('Ürünler getirilirken hata:', hata);
  }
}

// Lojistik Özet KPI Kartlarını Güncelle
function kpiKartlariniGuncelle(sevkiyatlar) {
  if (!sevkiyatlar) return;

  const toplamKayit = sevkiyatlar.length;

  const gelenToplam = sevkiyatlar
    .filter((s) => s.sevkiyatTuru === 'GELEN')
    .reduce((toplam, s) => toplam + Number(s.miktar), 0);

  const gidenToplam = sevkiyatlar
    .filter((s) => s.sevkiyatTuru === 'GIDEN')
    .reduce((toplam, s) => toplam + Number(s.miktar), 0);

  KPI_TOPLAM_SEVKIYAT.textContent = toplamKayit;
  KPI_GELEN_MIKTAR.textContent = `${gelenToplam} Adet`;
  KPI_GIDEN_MIKTAR.textContent = `${gidenToplam} Adet`;
}

// Veri tabanından tüm sevkiyatları çek
async function sevkiyatListesiniYukle() {
  try {
    const yanit = await fetch('/api/shipments');
    const veri = await yanit.json();

    if (veri.basarili) {
      tabloyuCiz(veri.sevkiyatlar);
      kpiKartlariniGuncelle(veri.sevkiyatlar);
    }
  } catch (hata) {
    console.error('Sevkiyatlar çekilirken hata:', hata);
  }
}

// Tabloya Sevkiyat Verilerini Bas
function tabloyuCiz(sevkiyatlar) {
  SEVKIYAT_TABLO_GOVDE.innerHTML = '';

  if (!sevkiyatlar || sevkiyatlar.length === 0) {
    SEVKIYAT_TABLO_GOVDE.innerHTML = `
      <tr class="bos-satir">
        <td colspan="6" style="text-align: center; color: #94a3b8; padding: 20px;">
          Henüz kayıtlı bir sevkiyat hareketi bulunmuyor.
        </td>
      </tr>
    `;
    return;
  }

  sevkiyatlar.forEach((s, index) => {
    const satir = document.createElement('tr');
    const rozetSinifi = s.sevkiyatTuru === 'GELEN' ? 'badge--gelen' : 'badge--giden';
    const tarihFormatli = s.tarih ? new Date(s.tarih).toLocaleString('tr-TR') : 'Tarih Yok';

    satir.innerHTML = `
      <td>${index + 1}</td>
      <td><strong>${s.urunAdi || 'Tanımsız Ürün'}</strong></td>
      <td><span class="badge ${rozetSinifi}">${s.sevkiyatTuru}</span></td>
      <td>${s.miktar} Adet</td>
      <td>${s.lokasyon}</td>
      <td>${tarihFormatli}</td>
    `;

    SEVKIYAT_TABLO_GOVDE.appendChild(satir);
  });
}

// Sevkiyat Formu Gönderimi
SEVKIYAT_KAYIT_FORMU.addEventListener('submit', async (e) => {
  e.preventDefault();

  BTN_KAYDET.disabled = true;
  BTN_KAYDET.textContent = 'Kaydediliyor...';

  const urunId = document.getElementById('urun-secim').value;
  const sevkiyatTuru = document.getElementById('sevkiyat-turu').value;
  const miktar = Number(document.getElementById('sevk-miktari').value);
  const lokasyon = document.getElementById('lokasyon-bilgisi').value;

  const yeniSevkiyat = { urunId, sevkiyatTuru, miktar, lokasyon };

  try {
    const yanit = await fetch('/api/shipments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(yeniSevkiyat)
    });

    const sonuc = await yanit.json();

    if (yanit.ok && sonuc.basarili) {
      bildirimGoster(sonuc.mesaj, 'basarili');
      SEVKIYAT_KAYIT_FORMU.reset();
      
      await sevkiyatListesiniYukle();
      await urunSecenekleriniYukle();
    } else {
      bildirimGoster(sonuc.mesaj || 'İşlem engellendi.', 'hata');
    }
  } catch (hata) {
    console.error('Gönderim hatası:', hata);
    bildirimGoster('Sunucuyla iletişim kurulamadı.', 'hata');
  } finally {
    BTN_KAYDET.disabled = false;
    BTN_KAYDET.textContent = 'Sevkiyat Kaydet';
  }
});

document.addEventListener('DOMContentLoaded', () => {
  urunSecenekleriniYukle();
  sevkiyatListesiniYukle();
});