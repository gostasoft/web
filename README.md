# Metin3 — Grand2 referanslı yeni web tasarımı

Grand2 sitesinin tanıtım, indirme ve oyuncu erişimi yapısından esinlenen, Metin3 için hazırlanmış bağımsız web tasarım önizlemesi.

Site, merkezi içerik yönetimi ve görsel yükleme için sunucu katmanı içerir. Kaynak web dosyaları `public/` içindedir; `dist/` derleme çıktısıdır ve doğrudan düzenlenmemelidir. Tasarımda yer alan haber ve açıklamalar başlangıç içerikleridir. Oyuncu giriş/kayıt ekranlarının gerçek oyun hesabı servisine henüz bağlantısı yoktur; indirme ve topluluk adresleri yönetim panelinden tanımlanabilir.

Site sahibi `/admin` üzerinden yetkili ChatGPT hesabıyla giriş yaparak metin, logo, görsel, haber, sınıf, dünya galerisi, soru ve bağlantıları değiştirebilir. **Siteyi Kaydet** değişiklikleri tüm ziyaretçilere uygular. Kullanım: [Yönetici Paneli](YONETICI_PANELI.md) · [Giriş ve kayıt ekranları](HESAP_EKRANLARI.md).

## Kaynak ve derleme

- `public/`: Site HTML/JS/CSS dosyaları, yönetim paneli ve görsel dosyaları.
- `app/`, `lib/cms-*.ts`: Sayfa yönlendirmeleri, yetki kontrolü, içerik/görsel API'leri ve sunucu doğrulaması.
- `public/cms-defaults.js`: Yayınla gelen başlangıç içerikleri ve düzenlenebilir alan tanımları. Kaydedilmiş yönetim içeriği veritabanından uygulanır.
- `drizzle/`: Veritabanı şeması ve geçişleri.
- `dist/client/`, `dist/server/`: Oluşturulan istemci ve Worker çıktıları.

Geliştirme için Node.js 22.13 veya üzeri ve kurulu bağımlılıklar gerekir. `npm run dev` yerel geliştirme sunucusunu, `npm run build` üretim derlemesini çalıştırır. Sunucu işlevleri nedeniyle `public/index.html` dosyasını doğrudan `file://` adresiyle açmak tam siteyi çalıştırmaz.

Yayınlar mevcut Sites projesi `appgprj_6ad158cae58c819187244d50e91cab3a` üzerinden yapılır. `.openai/hosting.json` içindeki proje kimliğini, `DB` D1 ve `BUCKET` R2 bağlarını koru; projeyi yalnızca statik `dist/` yayınına döndürme. Üretimde yetkili hesabın e-postası `CMS_ADMIN_EMAIL` sunucu ayarıyla tanımlanır; gizli ayarlar kaynak dosyalara yazılmaz. Kod değişiklikleri Sites derleme/paketleme/yayın akışıyla dağıtılır; panelden kaydedilen içerik için yeniden yayın gerekmez.

Oyun projesinden ayrı hazırlanmıştır.
