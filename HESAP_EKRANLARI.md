# Giriş ve kayıt ekranları

Oyuncu giriş ekranı `/#giris`, kayıt ekranı `/#kayit` adresinde açılır. Üst menü, başlangıç alanı, oyuncu paneli ve karakter sınıfı düğmeleri bu ekranlara gider. Şifre yardımı `/#sifre-yenile`, kullanıcı adı yardımı `/#kullanici-adi` adresindedir.

## Ekranları düzenlemek

Giriş ve kayıt sayfaları iki sütundan oluşur: solda karakter veya sahne görseli, sağda form bulunur. Ziyaretçi ekranlarındaki **Görseli değiştir** alanı kaldırılmıştır. Görseller ve metinler artık merkezi yönetim panelinden değiştirilir:

1. Sitenin `/admin` adresini aç ve yetkili site sahibi ChatGPT hesabınla giriş yap.
2. Menüden **Giriş ve Kayıt** bölümünü seç.
3. **Giriş Yap** veya **Kayıt Ol** sekmesini aç.
4. Sağ formun başlık ve açıklamasını; sol sahnenin üst başlık, ana başlık ve açıklamasını düzenle. Bu iki metin grubu birbirinden bağımsızdır.
5. Karakter sahnesine PNG, JPG, WebP veya AVIF yükle; istersen bir HTTPS görsel adresi gir. Dosya sınırı 10 MB'dir. Yatay/dikey odak ve yerleşim ayarlarıyla kadrajı belirle.
6. **Önizleme** ile sonucu kontrol et, ardından **Siteyi Kaydet** düğmesine bas.

Giriş ve kayıt sahneleri ayrı düzenlenir. Kayıt tamamlandığında değişiklikler sunucuda saklanır ve tüm ziyaretçiler için geçerli olur. Yalnızca görsel yüklemek yeterli değildir; içeriğe uygulanması için **Siteyi Kaydet** gerekir. Form alanlarının etiketleri ve genel giriş/kayıt düğme yazıları **Genel & Metinler** bölümünden değiştirilir.

Panelin diğer bölümleri, yedekler ve kayıt çakışmaları için [Yönetici Paneli kılavuzuna](YONETICI_PANELI.md) bak.

## Oyuncu hesabı işlemlerinin durumu

Formlarda boş alan, e-posta, yeni kullanıcı adı, şifre uzunluğu ve şifre eşleşmesi denetlenir; şifre göster/gizle kullanılabilir. **Kullanıcı adımı hatırla** seçilirse yalnızca kullanıcı adı ilgili tarayıcıda saklanır.

Oyuncu hesabı API'si henüz bağlı değildir. Formlar gerçek hesap oluşturmaz, oyuncu oturumu açmaz ve kurtarma e-postası göndermez. Şifreler sunucuya gönderilmez veya yerel depolamaya kaydedilmez; form gönderiminde durum kullanıcıya açıklanır. Bu işlemlerin çalışması için oyun hesabı servisinin ayrıca bağlanması gerekir.

Yönetim panelinin ChatGPT girişi yalnızca site içeriğini düzenleme yetkisini doğrular; oyuncu hesabı girişiyle bağlantılı değildir.

## Kaynak dosyaları

Ekran kodu `public/auth.js`, tasarımı `public/auth.css` ve `public/skin.css` içindedir. Yayınla birlikte gelen başlangıç içerikleri `public/cms-defaults.js` içinde; sahne başlangıç yapılandırması `public/auth-config.js` içindedir. Yönetim panelinde kaydedilen içerik sunucu veritabanından yüklenerek bu başlangıç değerlerinin üzerine uygulanır.

Güncel kaynak dosyalarını `public/` altında düzenle. `dist/` artık derleme çıktısıdır; burada yapılan doğrudan düzenlemeler sonraki derlemede kaybolur.
