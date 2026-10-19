# Sayfalar, ana sayfa düzeni ve menü

Bu araçlar mevcut yönetici panelinin içindedir. Giriş yöntemi ve içerik kaydı değişmez: normal `/#giris` ekranından yetkili yönetici girişi yap, düzenlemelerini hazırla ve **Siteyi Kaydet** ile uygula. Önceden kaydedilen site metinleri, görseller ve diğer CMS içerikleri korunur.

## Yeni sayfa oluşturmak

1. Sol menüden **Sayfalar** bölümünü aç ve **Yeni sayfa** seç.
2. Sayfa başlığını, adresini ve kısa açıklamasını yaz. Örneğin `Başlangıç Rehberi` sayfasının adresi `#sayfa/baslangic-rehberi` olabilir. Adresteki Türkçe harfler ve boşluklar uygun biçime çevrilir; aynı adres ikinci kez kullanılırsa benzersiz bir son ek eklenir.
3. Sayfanın ilk metin bölümünü düzenle veya **Bölüm ekle** ile başka şablonlar seç.
4. **Önizle** ile sayfayı masaüstü veya mobil görünümde incele. Taslak sayfalar da bu yönetici önizlemesinde açılır.
5. Hazır olduğunda **Sayfayı yayına aç** seçeneğini etkinleştir ve **Siteyi Kaydet** düğmesine bas.

Yeni sayfalar taslak olarak başlar. Taslağı kaydetmek onu ziyaretçilere açmaz; yayına açma seçeneği de tek başına kayıt yapmaz. Bir sayfanın menüde görünmesi için ayrıca **Menüye ekle** seçilir. Bu kısayolu taslak aşamasında hazırlayabilirsin; sayfa yayımlanana kadar ziyaretçi menüsünden gizlenir.

Soldaki sayfa listesinden düzenlenecek sayfayı seçebilirsin. **Kopyasını oluştur**, sayfayı farklı bir adresle taslak olarak çoğaltır. **Sayfayı kaldır**, sayfayı ve o sayfaya ait menü kısayollarını taslaktan çıkarır. Yanlışlıkla yapılan değişiklikleri **Geri al** ile geri getirebilirsin.

## Bölüm şablonları

| Şablon | Kullanımı |
| --- | --- |
| **Başlık ve metin** | Tanıtım, oyun kuralları veya uzun açıklamalar. |
| **Görsel ve metin** | Karakter, harita veya özellik görselinin yanında açıklama. Görsel sağa veya sola alınabilir. |
| **Bilgi kartları** | Özellikler, rehberler veya bağlantılar için başlıklı kartlar. Her kartın açıklaması, görseli ve isteğe bağlı bağlantısı vardır. |
| **Görsel galerisi** | Ekran görüntülerinden oluşan bir galeri. Görsellere başlık, açıklama ve isteğe bağlı bağlantı eklenebilir. |
| **Soru ve cevap** | Açılır soru ve yanıtlar. |
| **Duyuru ve buton** | Öne çıkan mesaj, isteğe bağlı görsel ve yönlendirme butonu. |
| **Serbest tasarım** | Yazı, görsel, buton ve kutuları tuvalde taşıma, boyutlandırma ve katmanlarla yerleştirme. Masaüstü ve mobil konumları ayrı hazırlanır. |

Bölüm listesinden düzenlemek istediğin bölüme tıkla. Üst başlık, başlık ve açıklamayı; varsa görsel, kart veya soruları aşağıdaki düzenleyiciden değiştir. Bölümün şablonunu değiştirmek diğer alanlarda hazırladığın içeriği silmez; o şablonda kullanılmayan alanlar taslakta kalır.

Hazır şablonlarda koyu siyah, bordo veya sayfa arka planı tonu; sola/ortaya hizalama ve dar/normal/geniş boşluk seçilebilir. Serbest tasarımda nesnelerin kendi konum, boyut, renk ve yazı ayarları vardır. Görsellerde dosya yükleme ve kadraj ayarları mevcut yönetim aracıyla aynıdır. Buton yazısı ve adresi isteğe bağlıdır. Metinler düz yazı olarak gösterilir; HTML, JavaScript veya CSS eklemek gerekmez.

Soldaki noktalı tutamaç, bölümleri sürükleyerek taşır. Bırakılacak yer çizgiyle gösterilir. Ok düğmeleri de bölümleri ve öğeleri taşır; klavyeyle veya dokunmatik kullanımda bunları kullanabilirsin. Kopyalama düğmesi bağımsız bir kopya oluşturur; çarpı düğmesi taslaktan kaldırır. **Görünür/Gizli**, içeriği silmeden ziyaretçi görünürlüğünü değiştirir. Bu düzenlemeler **Siteyi Kaydet** ile birlikte uygulanır.

## Ana sayfa düzeni

**Ana Sayfa Düzeni**, mevcut yedi site bölümünü ve sonradan eklediğin özel bölümleri gösterir. Hazır bölümler ana sahne, başlangıç adımları, haberler/hesap alanı, karakter sınıfları, dünya galerisi, sık sorulanlar ve topluluk çağrısıdır.

Hazır bölümleri sıralayabilir veya gizleyebilirsin. İçeriklerini değiştirmek için seçili bölümde **Bölüm içeriğini düzenle** düğmesini kullan; ilgili mevcut içerik alanına geçersin. **Bölüm ekle** ile yedi özel şablondan birini ana sayfaya yerleştirebilirsin. Yeni bölüm seçili bölümün arkasına eklenir; böylece mevcut bölümlerin arasına da serbest tasarım alanı koyabilirsin.

Seçili her bölümün altındaki **Bölüm boyutu ve hizası** alanı hazır bölümlerde de kullanılabilir. Masaüstü ve mobil için genişliği yüzde, yüksekliği otomatik veya sabit piksel olarak seç; bölümün sola, ortaya veya sağa hizasını ayarla. Genişlik %20–100, sabit yükseklik 200–6000 px aralığındadır. **Varsayılan boyuta dön**, yalnızca bölüm boyutu ayarını kaldırır. Eski bölümler yalnızca görüntülendikleri için yeniden boyutlandırılmaz. Mevcut bölümlerin iç düzeni kendi tasarımını kullanır; serbest konumlandıracağın nesneleri **Serbest tasarım** bölümüne ekle.

## Serbest tasarım tuvali

**Serbest tasarım** bölümünü seçtikten sonra **Yazı**, **Görsel**, **Buton** veya **Kutu** ekle. Tuvalde veya **Katmanlar** listesinde nesneyi seç; sürükleyerek yerini değiştir ve sağ alt köşesinden boyutlandır. Sağdaki özellik alanından X/Y konumunu, genişlik ve yüksekliğini kesin piksel değerleriyle ayarlayabilirsin.

Yazı ve buton metinleri; yazı boyutu, tipi, rengi ve kalınlığı; dolgu ve kenarlar özellik alanından düzenlenir. Görsel nesnesinde **Görsel yükle**, butonda **Tıklama bağlantısı** kullanılabilir. **Alan arka planı ve rengi**, bölümün arka planını düzenler. **Öne getir / Arkaya gönder** katman sırasını, **Konumu kilitle** taşıma ve boyutlandırmayı kontrol eder. **Öğeyi kaldır** seçili nesneyi siler.

**Masaüstü tasarımı** 1200 px, **Mobil tasarımı** 390 px çalışma genişliği kullanır. Konum ve boyutlar iki cihaz için ayrı saklanır; mobil yerleşimini ayrıca incele. **Mobil düzeni otomatik oluştur**, görünür nesneleri mobilde alt alta dizer. **Izgarayı göster** ve **10 px ızgaraya hizala**, yerleştirmeyi kolaylaştırır.

Seçili nesneyi ok tuşları 1 px, **Shift + ok** 10 px taşır; **Alt + ok** boyutlandırır. Boyutlandırma tutamacı odaktayken oklar doğrudan boyutu değiştirir. Üstteki **Geri al** veya metin alanı dışında **Ctrl+Z** son düzenlemeyi geri çevirir. Sonucu **Önizleme** ile kontrol et ve **Siteyi Kaydet** ile uygula. Daha ayrıntılı kullanım: [Serbest Tasarım kılavuzu](SERBEST_TASARIM.md).

## Menü

**Menü** bölümünde bağlantı ekle, yazısını ve adresini değiştir, oklarla sırala veya **Menüde göster** seçeneğini kapat. Bu menü masaüstü ve mobil gezinmeye birlikte uygulanır. Menü yazıları artık **Genel & Metinler** yerine buradan düzenlenir.

**Sayfa kısayolları** alanından hazırladığın özel sayfaları menüye ekleyebilirsin. Bir sayfa oluşturmak onu otomatik olarak menüye eklemez. Sayfa adresini değiştirince mevcut menü kısayolları da güncellenir. Web adresleri için HTTPS, sayfalar için `#sayfa/rehber`, mevcut bölümler için `#dunya` gibi bağlantılar kullanılabilir.

## Kayıt, yedek ve sınırlar

Önizleme kaydedilmemiş içeriği gösterir; ziyaretçilere uygulamaz. **Siteyi Kaydet**, sayfalar, ana sayfa düzeni, menü ve diğer site içeriğini birlikte sunucuya kaydeder. Hata veya başka bir oturumla çakışma olduğunda taslak açık sayfada tutulur ve eski sürüm yeni kaydın üzerine yazılmaz. Sayfayı kapatmadan önce kaydet veya **Yedek indir** kullan. Yedek, sayfa ve menü düzenini de içerir.

En çok 30 özel sayfa, ana sayfada 40 bölüm, bir özel sayfada 40 bölüm, menüde 20 bağlantı ve bir kart/galeri/soru bölümünde 20 öğe bulunabilir. Bir serbest tasarım alanı en çok 50 nesne; tüm site en çok 500 serbest nesne içerir. Ana sayfa ile tüm özel sayfalardaki bölümlerin toplamı en çok 200'dür. Mevcut oyun hesabı servislerinin durumu değişmez; sayfa düzenleyici oyuncu hesabı oluşturmaz veya oyun sunucusu yapılandırmaz.
