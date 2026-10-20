# MET3 ONLINE — Eklenebilir Animasyon Modülleri V01

Yerel demo: **http://127.0.0.1:5173/animation-lab/index.html**

Bu klasör bağımsız bir laboratuvardır. Ana sayfa, CMS, yönetim paneli, giriş/kayıt, D1/R2 ve mevcut içerik modeli değiştirilmedi. Ana sayfaya script veya bölüm otomatik eklenmedi. Git push ve canlı dağıtım yapılmadı. Önceki karakter kartı V01 çalışması bu klasörden ayrıdır.

## İnceleme ve tasarım

Mevcut proje Vinext/Vite ve Cloudflare Workers kullanıyor; ziyaretçi ana sayfası `public/` altındaki HTML/CSS/JavaScript üzerinden çalışıyor. Bu yüzden yeni bağımlılık eklemeyen, native ES module ve Web Component çözümü seçildi. Shadow DOM, bileşen CSS'sini ana sitenin CSS'sinden ayırır. `demo.css` yalnızca laboratuvarın sayfa düzeni içindir; ana siteye dahil edilmez.

Kullanıcının verdiği `2026-10-19 21-43-29.mp4` kaydının 24, 25 ve 27. saniye kareleri incelendi. Büyük karakter/koyu fon/sıcak ışık/seyrek parçacık fikri esas alındı. Videodan görsel, kod, animasyon veya yerleşim çıkarılıp kullanılmadı. Portrelerin çerçevelenmesi, enerji yayları ve eşya silueti bu laboratuvar için ayrı üretildi.

## Dört modül

| `variant` | Etki | Uygun kullanım |
| --- | --- | --- |
| `spotlight` | Sağda büyük portre; sıcak arka ışık, 7 sn floating, fareyle en fazla 2.2°/3° tilt, seyrek korlar; tıklama/dokunmayla sabit ışık vurgusu. | Karakter tanıtımı, sınıf detayları, kampanya bölümü. |
| `aura` | Karakter/obje arkasında yavaş kesik enerji yayları, pulse glow ve ince sis. | Şaman/Sura tanıtımı, beceri veya büyülü obje vitrini. |
| `item` | Silah siluetine maskelenmiş kısa ışık taraması, yumuşak sis ve floating; vurguda taramanın parlaklığı yumuşakça artar. | Ekipman, ödül, etkinlik eşyası kartı. |
| `ambient` | Metin arkasında ağır hareket eden kızıl ışık, sis ve az sayıda ember. | Geniş tanıtım, dünya hikâyesi veya çağrı bölümü. |

Bunlar gerçek CSS animasyonlarıdır; mevcut portreler ise **sabit tek katmanlı görsellerdir**. Uzuv, saç veya kumaş ayrı ayrı hareket etmiyor. Silah SVG'si bu çalışma için çizilmiş **temsili bir obje**; oyunda bulunan bir eşya olduğu iddia edilmez.

## Eklenen dosyalar

```text
public/animation-lab/
  index.html                  Dört modüllü bağımsız demo
  demo.css                    Yalnızca demo sayfası stilleri
  demo.js                     Demo: tümünü oynat/durdur
  animations.js               Tek yeniden kullanılabilir ES module
  animations.css              Bileşenin Shadow DOM stilleri
  assets/warrior.webp          Mevcut projeden kopyalanan portre
  assets/shaman.webp           Mevcut projeden kopyalanan portre
  assets/ember-blade.svg       Özgün temsili vektör silah
  README.md                   Bu rehber
lib/animation-lab.test.mjs     Hareket politikası ve medya yaşam döngüsü testleri
```

## Adım adım entegrasyon

1. `animation-lab` klasörünün tamamını hedef projenin statik dosyalarına kopyala. CSS, ES module ve `assets/` aynı klasörde kalsın. Bir HTTP sunucusu üzerinden kullan; `file://` ES module önizlemesi için uygun değildir.
2. İstenen sayfada ES module dosyasını **bir kez** yükle:

```html
<script type="module" src="/animation-lab/animations.js"></script>
```

3. Modülü istenen HTML bölümüne ekle. `slot="copy"` içine kendi başlık, açıklama ve gerekiyorsa gerçek bağlantını koy. `slot="art"` içindeki görseli değiştir:

```html
<met3-motion variant="spotlight" label="Savaşçı tanıtımı">
  <div slot="copy" class="kendi-metin-stilim">
    <h2>Hikâyeni yaz.</h2>
    <p>Kendi bölüm açıklaman.</p>
    <a href="/#kayit">Yolculuğa başla</a>
  </div>
  <img slot="art" src="/animation-lab/assets/warrior.webp"
       alt="MET3 Savaşçı" width="195" height="260"
       loading="lazy" decoding="async" draggable="false">
</met3-motion>
```

4. `variant` değerini `aura` veya `item` yaparak aynı sözleşmeyle diğer modülleri kullan. `ambient` için görsel slotuna ihtiyaç yoktur; sadece içerik koy. İstersen ambient modülüne de `slot="art"` görseli ve/veya WebM/MP4 ekleyebilirsin; bunlar metin arkasında düşük opaklıkta arka plan olur. Modüller tek başına da çalışır; diğer varyantları sayfaya eklemek gerekmez.
5. Şeffaf PNG/WebP kullanıyorsan `cutout` niteliğini ekle. Bu, portreye uygulanan kenar yumuşatmasını/arka çerçeveyi kaldırır; dosyanın arka planını kendiliğinden silmez.
6. Metinlerin tipografisini **kendi sınıfınla** düzenle; demo görünümünü kopyalamak istersen yalnızca `.lab-copy` ile ilgili kuralları kendi stil dosyana taşı. `demo.css` dosyasını ana siteye komple ekleme.
7. Boyut ve renk için kapsülün kendi CSS değişkenlerini kullan:

```html
<met3-motion variant="spotlight" label="Karakter vitrini"
  style="--met3-height:580px; --met3-height-mobile:680px;
         --met3-surface:#100e10; --met3-gold:#ddbb81">
  <!-- copy ve art slotları -->
</met3-motion>
```

Yükseklikler minimumdur; uzun metinlerde bölüm büyüyerek taşmayı önler. Renk değişkenlerinin tüm efektleri yeniden renklendiren bir tema editörü olduğu varsayılmamalıdır; kızıl/turuncu efekt detayları CSS dosyasında düzenlenebilir. Büyük gölgeleri/efektleri çoğaltmadan önce mobilde kontrol et.

**Mevcut CMS sınırlaması:** Bu sürüm CMS'ye yeni bir bölüm türü eklemez. Yönetim panelinde HTML/JS çalıştırma özelliği yoktur; kodu metin alanına yapıştırmak modülü eklemez. Yönetim panelinden seçilebilir modül tipi istenirse sonraki bir işte renderer + model + doğrulama üzerinden ayrıca bağlanmalıdır. Mevcut serbest tasarım veya içerik kayıtları bu işte değiştirilmedi.

## WebM ve MP4 slotları

Video zorunlu değildir. Kaliteli özgün klip hazır olduğunda aynı sunucuya koyup şu nitelikleri ekle:

```html
<met3-motion variant="spotlight" label="Savaşçı animasyonu"
  webm="/animation-lab/assets/warrior-idle.webm"
  mp4="/animation-lab/assets/warrior-idle.mp4">
  <div slot="copy"><h2>Savaşçı</h2></div>
  <img slot="art" src="/animation-lab/assets/warrior.webp"
       alt="MET3 Savaşçı" loading="lazy">
</met3-motion>
```

- Uygun codec varsa önce WebM; WebM desteklenmezse MP4 seçilir. Oynatım/çözme hatasında sıradaki formata geçilir. Tüm kaynaklar hatalıysa veya autoplay engellenirse görsel fallback kalır.
- Kaynaklar görünürlük/hareket koşulları sağlanmadan bağlanmaz. Videolar sessiz, loop, playsinline, preload=none olarak yönetilir. Oynayan video posterin yerini alır.
- Yalnızca sayfayla aynı origin'deki HTTP/HTTPS medya URL'leri kabul edilir. Harici CDN, kimlik bilgisi içeren URL, data: ve javascript: reddedilir. Harici hizmete istek veya kullanıcı verisi gönderilmez.
- Mobilde varsayılan olarak video yüklenmez; hafif CSS + görsel gösterilir. Mobilde özellikle video gerekiyorsa `mobile-video` eklenebilir; buna rağmen reduced-motion/Save-Data/kapalı sekme/ekran dışı durdurma önceliklidir.
- Öneri: sessiz 3–6 saniye kusursuz döngü, 24 fps; WebM VP9 ve MP4 H.264; eşleşen kadraj/arka plan. MP4 şeffaflığı desteklemediği için koyu fonla uyumlu sürüm gerekir. Kaynak dosyaları mümkün olduğunca küçük tut.

## Eşya maskesini değiştirme

Yeni eşyanın PNG/WebP/SVG siluetini hem `img` hem maske olarak kullan. Görsel ve maske aynı kadraj/şeffaflık sınırlarına sahip olmalı:

```html
<met3-motion variant="item" label="Eşya vitrini" cutout
  style="--met3-item-mask:url('/assets/benim-kilicim.webp')">
  <div slot="copy"><h3>Eşya adı</h3><p>Açıklaman.</p></div>
  <img slot="art" src="/assets/benim-kilicim.webp"
       alt="Eşyanın açıklaması" loading="lazy">
</met3-motion>
```

Şeffaf olmayan JPG maske olarak kullanılmamalı; aksi halde tarama eşya yerine dikdörtgen alanı aydınlatır. CSS maskesi desteklenmeyen eski tarayıcılarda tarama kapalı tutulur; görsel ve ışık çalışır.

## Hareket, erişilebilirlik ve yaşam döngüsü

- Her modül bağımsız durdurma düğmesine sahiptir. HTML'de `paused` ile durağan başlatılabilir; dışarıdan `element.setAttribute('paused','')` / `removeAttribute('paused')` ile kontrol edilebilir. Düğmeler klavyeyle kullanılabilir.
- `prefers-reduced-motion: reduce` ve `navigator.connection.saveData` her zaman otomatik hareketi durdurur. Bu tercihler kullanıcı düğmesiyle aşılmaz. Reduced-motion ortamında dekoratif parçacıklar da gizlenir.
- IntersectionObserver modül tamamen ekran dışına çıkınca tüm CSS döngülerini ve videoyu durdurur. Görünür olunca devam eder. Destek yoksa scroll/resize görünürlük kontrolü kullanılır. Gizli tarayıcı sekmesi de durdurulur.
- Mobilde 9 yerine 3 parçacık, 3 yerine 1 enerji yayı, 10 saniyelik en fazla 3px floating ve durağan sis kullanılır. Fare tilt'i mobilde yoktur. Vurgu düğmesi dokunma/klavyeyle çalışır.
- Sürekli JavaScript render döngüsü, Canvas, GSAP, harici font/CDN veya zorunlu paket yoktur. Fare hareketi tek requestAnimationFrame ile birleştirilir; diğer hareketler CSS transform/opacity animasyonlarıdır.
- Bileşen DOM'dan çıkarıldığında observer, olaylar, bekleyen pointer frame ve video kaynakları temizlenir. Aynı düğüm yeniden eklendiğinde bağlantılar yeniden kurulur.
- Slotted metin ve bağlantılar gerçek HTML'dir; dekoratif katmanlar pointer-events:none olduğu için bağlantıları kapatmaz. Görsellere anlamlı alt, modüle açıklayıcı label ver.

## Varlıklar: hazır olanlar ve eksikler

| Varlık | Durum / yapılacak iş |
| --- | --- |
| Savaşçı/Şaman portreleri | Projedeki 195×260 WebP dosyalarının kopyası. Demo için kullanılabilir; büyük vitrinde çözünürlük sınırı vardır. |
| Yüksek çözünürlüklü karakter cutout | **Eksik.** Öneri 900×1200 veya üzeri, şeffaf PNG/WebP; kişi kullanım hakkı kendisine ait render sağlamalı. `slot="art"` ve `cutout` ile değiştirilir. |
| Gerçek idle/büyü/saldırı WebM/MP4 klipleri | **Eksik.** V01'de gerçek animasyonlu karakter modeli yok; slot altyapısı hazır. |
| Gerçek oyun silah/eşya görseli | **Eksik.** `ember-blade.svg` bu laboratuvar için özgün temsili objedir. Oyun görseli ve eşleşen siluet maskesiyle değiştirilir. |
| Ayrı uzuv/saç/kumaş katmanları, rig | **Eksik; isteğe bağlı ileri aşama.** Bu sürüm tek görseli bütün olarak hareket ettirir. Gerçek çok katmanlı deformasyon için ayrı katmanlar/rig veya önceden render edilmiş video gerekir. |
| Aura, ember sprite, duman texture | V01 için gerekmez; CSS gradient/şekilleriyle üretilir. İstenirse ileride özgün texture'larla geliştirilebilir. |

## GIF yalnızca önizleme içindir

Production bileşen GIF'e bağlı değildir. Paylaşılabilir kısa bir GIF gerekiyorsa kendi loop kaydını FFmpeg ile ayrıca çevirebilirsin (bu komut tarayıcı HTML/CSS'sini kaydetmez; mevcut videoyu çevirir):

```text
ffmpeg -i kendi-loop-kaydin.mp4 -t 4 -filter_complex "fps=12,scale=480:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" -loop 0 met3-onizleme.gif
```

Ana sitede bu GIF'i animasyon altyapısının yerine kullanma. Ekran görüntüleri loop hareketini göstermez; çalışan demo üzerinden incelenmelidir.

## Doğrulama

Otomatik test: `node --test lib/animation-lab.test.mjs`. Tam proje derlemesi: `npm run build`.

- Yeni 8 laboratuvar testi ve mevcut 42 test: **50/50 başarılı**. TypeScript, JS sözdizimi, Git diff kontrolü ve üretim derlemesi geçti.
- Gerçek tarayıcı: masaüstü, 390/320px mobil, yatay taşma, dokunma vurgusu, klavyeden hareket kontrolü, ortak durdur/oynat, fare tilt'i ve ekran dışı CSS durdurma kontrol edildi. Mobilde 3 parçacık ve video kaynağının hiç bağlanmaması doğrulandı.
- Geçici, yalnızca renkli kutu içeren teknik kliplerle gerçek WebM ve MP4 decode/oynatma; bozuk WebM'den MP4'e geçiş; iki kaynakta hata olduğunda poster; video durdurma/devam; DOM'dan çıkarıp tekrar ekleme; ambient videonun arka planda kalması ve içerik bağlantısının tıklanabilmesi doğrulandı. Teknik klipler ve QA sayfaları teslimden önce silindi. Bunlar özgün karakter animasyonu olduğu iddia edilen dosyalar değildi.
- Ana siteye ait HTML/app/CMS/admin/auth/builder/canvas/hosting dosyalarının iş başındaki SHA256 özetleriyle son halleri aynı bulundu. Mevcut içerik kayıtlarına yazılmadı.
- Laboratuvar tarayıcı hata günlüğü temizdi. Sistem reduced-motion ve Save-Data kararları otomatik testlerde doğrulandı; bunlar gerçek işletim sistemi/şebeke ayarları değiştirilerek denenmedi.

Önizleme sunucusu kullanıcı incelemesi için açık bırakılır; bilgisayar yeniden başlarsa önceki `MET3-Karakter-Onizleme.cmd` aynı proje sunucusunu yeniden açabilir. Bu klasör sunucu çalışırken doğrudan `/animation-lab/index.html` adresinden açılır.
