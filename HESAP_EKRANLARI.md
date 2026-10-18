# Giriş ve kayıt ekranları

Oyuncu giriş ekranı `/#giris`, kayıt ekranı `/#kayit` adresinde açılır. Üst menü, başlangıç alanı, oyuncu paneli ve karakter sınıfı düğmeleri bu ekranlara gider. Şifre yardımı `/#sifre-yenile`, kullanıcı adı yardımı `/#kullanici-adi` adresindedir.

## Ekranları düzenlemek

Giriş ve kayıt sayfaları iki sütundan oluşur: solda karakter veya sahne görseli, sağda form bulunur. Ziyaretçi ekranlarındaki **Görseli değiştir** alanı kaldırılmıştır. Görseller ve metinler artık merkezi yönetim panelinden değiştirilir:

1. Sitenin normal **Giriş Yap** ekranını (`/#giris`) aç. Site sahibine özel tanımlanan yönetici kullanıcı adı ve şifreyle giriş yaptığında `/admin` paneline yönlendirilirsin. Ana menüde veya alt bilgide yönetici bağlantısı bulunmaz.
2. Menüden **Giriş ve Kayıt** bölümünü seç.
3. **Giriş Yap** veya **Kayıt Ol** sekmesini aç.
4. Sağ formun başlık ve açıklamasını; sol sahnenin üst başlık, ana başlık ve açıklamasını düzenle. Bu iki metin grubu birbirinden bağımsızdır.
5. Karakter sahnesine PNG, JPG, WebP veya AVIF yükle; istersen bir HTTPS görsel adresi gir. Dosya sınırı 10 MB'dir. Yatay/dikey odak ve yerleşim ayarlarıyla kadrajı belirle.
6. **Önizleme** ile sonucu kontrol et, ardından **Siteyi Kaydet** düğmesine bas.

Giriş ve kayıt sahneleri ayrı düzenlenir. Kayıt tamamlandığında değişiklikler sunucuda saklanır ve tüm ziyaretçiler için geçerli olur. Yalnızca görsel yüklemek yeterli değildir; içeriğe uygulanması için **Siteyi Kaydet** gerekir. Form alanlarının etiketleri ve genel giriş/kayıt düğme yazıları **Genel & Metinler** bölümünden değiştirilir.

Panelin diğer bölümleri, yedekler ve kayıt çakışmaları için [Yönetici Paneli kılavuzuna](YONETICI_PANELI.md) bak.

## Oyuncu hesabı işlemlerinin durumu

Formlarda boş alan, e-posta, yeni kullanıcı adı, şifre uzunluğu ve şifre eşleşmesi denetlenir; şifre göster/gizle kullanılabilir. **Kullanıcı adımı hatırla**, oyuncu hesap servisi bağlanana kadar devre dışıdır. Yönetici kullanıcı adı ve şifresi tarayıcı depolamasına kaydedilmez; önceki sürümden kalan hatırlanan kullanıcı adı ekran açıldığında, başarılı yönetici girişinde ve çıkışta temizlenir.

Giriş formu kullanıcı adı ve şifreyi aynı sitedeki `/api/auth/login` adresine HTTPS üzerinden gönderir. Yalnızca site sahibi için tanımlanan özel yönetici bilgileri doğrulandığında gerçek yönetici oturumu açılır. Başarısız denemelerde genel bir hata gösterilir; sahte oyuncu oturumu açılmaz.

Oyuncu hesabı API'si henüz bağlı değildir. Normal oyuncular için giriş, hesap oluşturma ve kurtarma e-postası işlemleri çalışmaz. Kayıt ve kurtarma formları bilgileri bir servise göndermez; bu durum kullanıcıya açıklanır. Oyun hesabı işlemleri için oyuncu hesap servisinin ayrıca bağlanması gerekir. Gönderim sonrasında şifre alanları temizlenir; şifreler yerel depolamaya kaydedilmez.

Yönetici oturumu en çok 8 saat sürer. Paneldeki **Güvenli çıkış**, sunucudaki oturum çerezini temizler ve normal giriş ekranına döner. Özel giriş bilgileri yalnızca Sites sunucu sırlarında yapılandırılır; HTML, JavaScript veya bu belgelerde gerçek giriş bilgisi bulunmaz. Ayrıntılar: [Yönetici Paneli](YONETICI_PANELI.md).

## Kaynak dosyaları

Ekran kodu `public/auth.js`, tasarımı `public/auth.css` ve `public/skin.css` içindedir. Yayınla birlikte gelen başlangıç içerikleri `public/cms-defaults.js` içinde; sahne başlangıç yapılandırması `public/auth-config.js` içindedir. Yönetim panelinde kaydedilen içerik sunucu veritabanından yüklenerek bu başlangıç değerlerinin üzerine uygulanır.

Güncel kaynak dosyalarını `public/` altında düzenle. `dist/` artık derleme çıktısıdır; burada yapılan doğrudan düzenlemeler sonraki derlemede kaybolur.
