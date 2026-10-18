# Metin3 — Grand2 referanslı yeni web tasarımı

Grand2 sitesinin tanıtım, indirme ve oyuncu erişimi yapısından esinlenen, Metin3 için hazırlanmış bağımsız web tasarım önizlemesi.

Site, merkezi içerik yönetimi ve görsel yükleme için sunucu katmanı içerir. Kaynak web dosyaları `public/` içindedir; `dist/` derleme çıktısıdır ve doğrudan düzenlenmemelidir. Tasarımda yer alan haber ve açıklamalar başlangıç içerikleridir. Oyuncu giriş/kayıt ekranlarının gerçek oyun hesabı servisine henüz bağlantısı yoktur; indirme ve topluluk adresleri yönetim panelinden tanımlanabilir.

Site sahibi normal `/#giris` formundaki özel yönetici kullanıcı adı/e-posta ve şifreyle doğrulanınca `/admin` paneline yönlendirilir. Menüde veya alt bilgide yönetici bağlantısı gösterilmez. Panelden metin, logo, görsel, haber, sınıf, dünya galerisi, soru ve bağlantılar düzenlenebilir. **Siteyi Kaydet** değişiklikleri tüm ziyaretçilere uygular. Oturum 8 saat geçerlidir; panelde **Güvenli çıkış** bulunur. Kullanım: [Yönetici Paneli](YONETICI_PANELI.md) · [Giriş ve kayıt ekranları](HESAP_EKRANLARI.md).

## Kaynak ve derleme

- `public/`: Site HTML/JS/CSS dosyaları, panel JavaScript/CSS dosyaları ve görseller.
- `app/`, `lib/cms-*.ts`: Sayfa yönlendirmeleri, korunan `app/admin/panel.html` panel şablonu, yetki kontrolü, giriş/çıkış ve içerik/görsel API'leri.
- `public/cms-defaults.js`: Yayınla gelen başlangıç içerikleri ve düzenlenebilir alan tanımları. Kaydedilmiş yönetim içeriği veritabanından uygulanır.
- `drizzle/`: Veritabanı şeması ve geçişleri.
- `dist/client/`, `dist/server/`: Oluşturulan istemci ve Worker çıktıları.

Geliştirme için Node.js 22.13 veya üzeri ve kurulu bağımlılıklar gerekir. `npm run dev` yerel geliştirme sunucusunu, `npm run build` üretim derlemesini çalıştırır. Sunucu işlevleri nedeniyle `public/index.html` dosyasını doğrudan `file://` adresiyle açmak tam siteyi çalıştırmaz.

Yayınlar mevcut Sites projesi `appgprj_6ad158cae58c819187244d50e91cab3a` üzerinden yapılır. `.openai/hosting.json` içindeki proje kimliğini, `DB` D1 ve `BUCKET` R2 bağlarını koru; projeyi yalnızca statik `dist/` yayınına döndürme. Kod değişiklikleri Sites derleme/paketleme/yayın akışıyla dağıtılır; panelden kaydedilen içerik için yeniden yayın gerekmez.

Yönetici erişim ayarları yalnızca Sites sunucu sırlarında tutulur: `CMS_ADMIN_EMAIL` doğrulanmış site sahibini, `CMS_LOGIN_EMAIL` özel giriş kullanıcı adını, `CMS_PASSWORD_HASH` ise tuzlanmış PBKDF2-SHA256 şifre özetini tanımlar. Gerçek değerleri kaynak dosyalara, istemci JavaScript'ine, dokümana veya yerel ayar örneklerine yazma. Sunucu hem Sites sahip kimliğini hem özel yönetici oturumunu doğrular; yalnızca menüyü gizlemek erişim kontrolü değildir. `/api/auth/login` başarılı doğrulamada HttpOnly/Secure oturum çerezi oluşturur; `/api/auth/logout` temizler. Şifre veya oturum belirteci localStorage'a yazılmaz. Oyuncu kaydı ve oyun hesabı girişi için ayrıca oyun hesabı API'si gerekir.

Oyun projesinden ayrı hazırlanmıştır.
