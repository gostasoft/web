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

Bölüm listesinden düzenlemek istediğin bölüme tıkla. Üst başlık, başlık ve açıklamayı; varsa görsel, kart veya soruları aşağıdaki düzenleyiciden değiştir. Bölümün şablonunu değiştirmek diğer alanlarda hazırladığın içeriği silmez; o şablonda kullanılmayan alanlar taslakta kalır.

Her özel bölümde koyu siyah, bordo veya sayfa arka planı tonu; sola/ortaya hizalama ve dar/normal/geniş boşluk seçilebilir. Görsellerde dosya yükleme ve kadraj ayarları mevcut yönetim aracıyla aynıdır. Buton yazısı ve adresi isteğe bağlıdır. Metinler düz yazı olarak gösterilir; HTML, JavaScript veya CSS eklemek gerekmez.

Oklar bölümleri ve öğeleri taşır. Kopyalama düğmesi bağımsız bir kopya oluşturur; çarpı düğmesi taslaktan kaldırır. **Görünür/Gizli**, içeriği silmeden ziyaretçi görünürlüğünü değiştirir. Bu düzenlemeler **Siteyi Kaydet** ile birlikte uygulanır.

## Ana sayfa düzeni

**Ana Sayfa Düzeni**, mevcut yedi site bölümünü ve sonradan eklediğin özel bölümleri gösterir. Hazır bölümler ana sahne, başlangıç adımları, haberler/hesap alanı, karakter sınıfları, dünya galerisi, sık sorulanlar ve topluluk çağrısıdır.

Hazır bölümleri sıralayabilir veya gizleyebilirsin. İçeriklerini değiştirmek için seçili bölümde **Bölüm içeriğini düzenle** düğmesini kullan; ilgili mevcut içerik alanına geçersin. **Bölüm ekle** ile altı özel şablondan birini ana sayfaya yerleştirebilirsin. Yeni bölüm seçili bölümün arkasına eklenir.

## Menü

**Menü** bölümünde bağlantı ekle, yazısını ve adresini değiştir, oklarla sırala veya **Menüde göster** seçeneğini kapat. Bu menü masaüstü ve mobil gezinmeye birlikte uygulanır. Menü yazıları artık **Genel & Metinler** yerine buradan düzenlenir.

**Sayfa kısayolları** alanından hazırladığın özel sayfaları menüye ekleyebilirsin. Bir sayfa oluşturmak onu otomatik olarak menüye eklemez. Sayfa adresini değiştirince mevcut menü kısayolları da güncellenir. Web adresleri için HTTPS, sayfalar için `#sayfa/rehber`, mevcut bölümler için `#dunya` gibi bağlantılar kullanılabilir.

## Kayıt, yedek ve sınırlar

Önizleme kaydedilmemiş içeriği gösterir; ziyaretçilere uygulamaz. **Siteyi Kaydet**, sayfalar, ana sayfa düzeni, menü ve diğer site içeriğini birlikte sunucuya kaydeder. Hata veya başka bir oturumla çakışma olduğunda taslak açık sayfada tutulur ve eski sürüm yeni kaydın üzerine yazılmaz. Sayfayı kapatmadan önce kaydet veya **Yedek indir** kullan. Yedek, sayfa ve menü düzenini de içerir.

En çok 30 özel sayfa, ana sayfada 40 bölüm, bir özel sayfada 40 bölüm, menüde 20 bağlantı ve bir bölümde 20 öğe bulunabilir. Ana sayfa ile tüm özel sayfalardaki bölümlerin toplamı en çok 200'dür. Mevcut oyun hesabı servislerinin durumu değişmez; sayfa düzenleyici oyuncu hesabı oluşturmaz veya oyun sunucusu yapılandırmaz.
