# Giriş, kayıt ve sol alan görselleri

Giriş ekranı `/#giris`, kayıt ekranı `/#kayit` adresinde açılır. Üst menü, başlangıç alanı, oyuncu paneli ve sınıf bölümündeki hesap düğmeleri bu ekranlara gider. Şifre ve kullanıcı adı yardım ekranları da bulunur.

## Sol alanı kendin değiştirmek

Giriş veya kayıt ekranında sol üstteki **Görseli değiştir** düğmesine bas:

1. Hazır bir sahne seç, bilgisayarından PNG/JPG/WebP/AVIF yükle veya HTTPS görsel adresi gir.
2. Yatay ve dikey konum kaydırıcılarıyla kırpmanın odağını ayarla.
3. **Görseli Uygula** düğmesine bas.

Giriş ve kayıt görselleri ayrı saklanır. Seçimler yalnızca o tarayıcının yerel depolamasına kaydedilir; dosyalar sunucuya yüklenmez. Tarayıcı verileri temizlenirse varsayılan görsellere dönülür. **Varsayılana dön** düğmesi yalnızca seçili ekranın görselini sıfırlar.

Site genelinde herkesin göreceği varsayılan görseli değiştirmek için görsel dosyasını `dist/assets/` içine ekle ve `dist/auth-config.js` içindeki `login.src` veya `register.src` değerini güncelle. `x` ve `y` değerleri yüzde olarak görsel odağıdır. Aynı dosyada sol alandaki başlık ve açıklama da değiştirilebilir. Site genelindeki dosya değişiklikleri yeniden yayımlanmalıdır.

## Hesap işlemlerinin durumu

Formlar düzenlenebilir; boş alan, e-posta, yeni kullanıcı adı, şifre uzunluğu ve şifre eşleşmesi kontrol edilir. Şifre göster/gizle çalışır. **Kullanıcı adımı hatırla**, yalnızca seçildiğinde kullanıcı adını tarayıcıda saklar.

Bu proje statik bir sitedir ve henüz oyun hesabı API'si yoktur. Formlar gerçek hesap oluşturmaz, giriş yapmaz veya e-posta göndermez; bu durum gönderim sonrasında açıkça belirtilir. Şifreler yerel depolamaya kaydedilmez ve herhangi bir servise iletilmez. Gerçek işlemler için oyuncu hesap servisinin ayrıca bağlanması gerekir.
