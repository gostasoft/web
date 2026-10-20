# MET3 ONLINE — Karakter bölümü V01

## Mevcut proje değerlendirmesi

Kaynak dizini: `C:\Users\Eto\Documents\Codex\2026-10-14\se\outputs\metin3-grand-yeniden-tasarim-v1`.

Proje Vinext, Vite ve Cloudflare Workers kullanıyor. Ana sayfa `app/route.ts` üzerinden `public/index.html` şablonunu sunuyor; ziyaretçi arayüzü düz JavaScript/CSS ile çalışıyor. `public/app.js` haberleri, sınıf sekmelerini, dünya seçimini ve pencereleri yönetiyor. `cms.js` D1 içeriklerini yükleyip aynı içerik nesnesini güncelliyor. `builder.js` mevcut ana sayfa bölümlerinin sıralamasını/görünürlüğünü ve özel sayfaları; canvas modülleri serbest tasarımları yönetiyor. Kimlik doğrulaması ve korumalı yönetim paneli sunucu tarafında ayrı kalıyor.

Önceki sınıf bölümü dört statik portre, seçili sınıf açıklaması, ok tuşları ve kayıt bağlantısı içeriyordu. Kullanılan özgün proje varlıkları: `assets/class-{warrior,ninja,sura,shaman}.webp` ve `assets/ui/class-*.png`. Projenin `public/` dizininde karakter videosu/WebM/MP4/GIF bulunmadı. Önceki animasyonlar temel CSS geçişleriyle sınırlıydı.

[Misali2 referansı](https://www.misali2.com/) tarayıcıda incelendi: dört sınıfın hareketli sunumu ve fare/dokunma üzerinden keşif yaklaşımı değerlendirildi. Referansın kodu, görselleri ve animasyon dosyaları alınmadı. Bu üretim, MET3'ün mevcut portreleri ve sınıf sembolleri üzerine altın çerçeve, koyu metal, bordo/kırmızı ışık ve özgün kart katmanları ekler. Diğer bölümler yeniden tasarlanmadı.

## Bu sürümde çalışanlar

- Savaşçı, Ninja, Sura ve Şaman: CMS'deki mevcut ad, açıklama, portre ve semboller korunarak dört etkileşimli kart.
- Fareyle vurgu ve ışık odağı; tıklama/dokunma ile mevcut açıklama panelini seçme. Sol/sağ ok, Home ve End tuşları ile erişilebilir sekme dolaşımı korunur.
- CSS atmosfer efektleri; `attack`, `magic`, `energy` efekt sınıfları. Bunlar karakterin gerçek saldırı/büyü animasyonu değildir.
- İsteğe bağlı döngülü `idle` videosu ve seçimde bir kez oynayıp idle'a dönen `action` videosu. Video yoksa mevcut görseller kullanılır. Durum etiketleri bunu açıkça belirtir.
- Aynı anda en fazla bir etkin video oynar. Masaüstünde fareyle incelenen kart önceliklidir; aksi halde seçili kart kullanılır. Mobilde seçim tıklama/dokunmayla yapılır.
- Videonun kaynakları yalnızca gerektiğinde bağlanır. Ekran dışı, gizli sekme, başka sayfaya geçiş, kullanıcı durdurması, azaltılmış hareket veya veri tasarrufunda video/atmosfer durur. Sürekli JavaScript animasyon döngüsü yoktur.
- Hareket düğmesinin tercihi yalnızca tarayıcı oturumu için tutulur. Sistem azaltılmış hareket veya veri tasarrufu istiyorsa düğme bunu gösterir ve otomatik oynatmayı açamaz.
- Video hatası/otomatik oynatma reddi poster görsele döner. CMS yeniden çiziminde video kaynakları, gözlemciler ve olay dinleyicileri temizlenir.
- Masaüstünde dört, tablette iki, dar mobilde bir sütun. Yeni bağımlılık veya GSAP eklenmedi.

## Eksik özgün animasyonlar

Aşağıdaki **8 klip henüz yoktur**. Bunlar temin edilmeden karakterler hareketli model olarak gösterilemez. V01'de mevcut statik portreler ve gerçek CSS atmosfer efektleri görüntülenir.

| Sınıf | Döngülü bekleme | Seçimde hareket |
| --- | --- | --- |
| Savaşçı | `warrior-idle` | `warrior-attack` — kılıç saldırısı |
| Ninja | `ninja-idle` | `ninja-attack` — çevik saldırı |
| Sura | `sura-idle` | `sura-magic` — kılıç/büyü |
| Şaman | `shaman-idle` | `shaman-cast` — enerji/büyü |

Her klip için aynı kadrajda `.webm` (VP9) ve `.mp4` (H.264) alternatifleri hazırlanabilir; toplam 16 dosya. Önerilen üretim hedefi 720×960, 24–30 fps, sessiz; idle 3–6 saniye kusursuz döngü, hareket 1–2 saniye. Mümkünse dosya başına 2 MB civarı tutulmalı. MP4 şeffaflık sağlamadığından koyu fonla uyumlu görüntü hazırlanmalı; WebM/MP4 kadrajları ve zeminleri aynı görünmelidir. Alt bölümde isim/açıklama alanı kalacağı için yüzü üst üçte birde tutun. Yalnızca kullanım hakkı size ait MET3 karakter kayıtları/renderları kullanılmalı.

Dosyalar `public/assets/characters/` içine yerleştirildikten sonra `public/character-config.js` içinde ilgili slot doldurulur:

```js
warrior: {
  effect: 'attack',
  idle: [
    { src: 'assets/characters/warrior-idle.webm', type: 'video/webm' },
    { src: 'assets/characters/warrior-idle.mp4', type: 'video/mp4' }
  ],
  action: [
    { src: 'assets/characters/warrior-attack.webm', type: 'video/webm' },
    { src: 'assets/characters/warrior-attack.mp4', type: 'video/mp4' }
  ]
}
```

Tek format da kullanılabilir. `effect`: `attack`, `magic`, `energy`; `action` isteğe bağlıdır. Yalnızca aynı sitedeki `assets/` yolları kabul edilir; harici URL veya betik eklenemez. Dosya adları ASCII olmalıdır. Henüz bulunmayan dosya yollarını etkinleştirmeyin. Yeni sınıf CMS'den eklenirse bilinen bir yapılandırması olmadan da normal görsel kart olarak çalışır.

Metin ve poster görselleri mevcut yönetim panelinden düzenlenmeye devam eder. V01 video slotları kaynak yapılandırmasıdır; yönetim paneline video yükleme aracı eklenmedi. D1/R2 kayıtları, güvenlik kuralları, mevcut kullanıcı içerikleri ve korumalı panel değiştirilmedi.

## Değiştirilen dosyalar

| Dosya | Değişiklik |
| --- | --- |
| `public/app.js` | Mevcut sınıf kartı işaretlemesini genişletir; CMS çiziminde hareket yaşam döngüsünü bağlar/temizler. |
| `public/index.html` | Yalnızca karakter dosyalarını, hareket düğmesini ve durum notunu ekler. |
| `public/character-config.js` | Dört sınıf için boş idle/action slotları ve efekt eşlemesi. |
| `public/character-motion.js` | Güvenli video kaynakları, görünürlük, oynatma, hata/fallback, ışık etkileşimi ve temizleme. |
| `public/character-motion.css` | Sadece `#siniflar` altında kart görünümü, atmosfer ve duyarlı/erişilebilir hareket kuralları. |
| `lib/character-motion.test.mjs` | Medya doğrulaması, fare/dokunma, yükleme bütçesi, durdurma, hatalar ve temizleme için 8 test. |
| `KARAKTER_ANIMASYONLARI_V01.md` | İnceleme, kullanım, eksikler ve doğrulama raporu. |

## Kontrol ve yerel önizleme

Üretim derlemesi, TypeScript, değişen JavaScript dosyalarının sözdizimi ve `git diff --check` geçti. Mevcut 34 sunucu/CMS testi ile 8 yeni hareket testi: **42/42 başarılı**.

Gerçek tarayıcıda masaüstü, 800px tablet ve 390/320px mobil görünüm kontrol edildi; yatay taşma görülmedi. Sınıf seçimi, ok tuşları, hareket aç/kapat, mobil menü, sınıftan kayıt ekranına geçiş, giriş ekranı, mevcut özel sayfa ve sayfa gizlenince efektlerin durması doğrulandı. Gerçek video dosyaları bulunmadığından video oynatma yaşam döngüsü sahte medya nesneleriyle birim test edildi; özgün dosyalar eklendiğinde codec, döngü ve görsel kadraj ayrıca tarayıcıda doğrulanmalıdır.

Yerel önizleme için kaynak dizininde `npm run dev` çalıştırılır; adres `http://127.0.0.1:5173/#siniflar`. Bu makinenin Node/PATH hazırlığını yapan `MET3-Karakter-Onizleme.cmd` başlatıcısı kullanıcı teslimat klasöründedir. Dosyaya çift tıklayıp sunucu hazır olduktan sonra bu adres açılabilir; pencere kapatıldığında önizleme durur. Test sunucusu teslim öncesinde kapatılmıştır. Testler önceden var olan yerel CMS verileriyle yapıldı; canlı içerik kaydı yapılmadı.

**V01 yerel çalışma olarak bırakıldı. Git commit/push veya canlı dağıtım yapılmadı.**
