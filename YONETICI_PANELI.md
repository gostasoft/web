# Metin3 Yönetici Paneli

Yönetim paneli, Metin3 sitesinin yazılarını, görsellerini ve bağlantılarını kod düzenlemeden değiştirmek içindir. Kaydedilen içerik sunucuda saklanır; aynı değişiklikler sitenin bütün ziyaretçilerine uygulanır.

## Panele giriş

Sitenin normal [Giriş Yap ekranını](https://metin3-efsane-20261016.keendream2.chatgpt.site/#giris) aç ve site sahibi için tanımlanan özel kullanıcı adı/e-posta ve şifreyi gir. Doğru bilgiler doğrulandığında `/admin` paneline yönlendirilirsin. Ana menüde, alt bilgide veya ayrı bir herkese açık düğmede yönetici bağlantısı bulunmaz.

Özel giriş bilgileri yalnızca Sites sunucu sırlarında yapılandırılır; gerçek kullanıcı adı veya şifre kaynak kodunda, bu kılavuzda ve tarayıcı depolamasında tutulmaz. Sunucu, özel giriş bilgilerine ek olarak sitenin doğrulanmış sahip kimliğini de kontrol eder. Normal oyuncu kaydı yönetici yetkisi vermez.

Oturum en çok **8 saat** geçerlidir; süre dolduğunda yeniden normal giriş ekranından giriş yap. Oturumsuz `/admin` erişimi giriş ekranına yönlenir. Ayrı bir ChatGPT giriş düğmesi veya yönetici şifresini içeren istemci ayarı yoktur.

## Güvenli çıkış

Panelin sol altında **Güvenli çıkış** düğmesi bulunur. Bu düğme `/api/auth/logout` üzerinden oturum çerezini sunucuda sonlandırır, önceki hatırlanan kullanıcı adını temizler ve `/#giris` ekranına döner. Kaydedilmemiş değişiklik varsa çıkmadan önce kaydet veya yedeğini indir. Oturum açma ve kapatma işlemleri aynı site üzerinden yapılır; panel çerezini JavaScript okuyamaz.

## İçerik bölümleri

| Bölüm | Düzenleyebileceğin alanlar |
| --- | --- |
| **Sayfalar** | Özel sayfa oluşturma, adres ve yayın durumu; altı şablonla sayfa içeriklerini tasarlama. |
| **Ana Sayfa Düzeni** | Mevcut site bölümlerini sıralama/gizleme; özel metin, görsel, kart, galeri, soru ve buton bölümleri ekleme. |
| **Menü** | Menü bağlantısı ekleme, yazı/adres/görünürlük ve sıralama; özel sayfalara kısayollar. |
| **Genel & Metinler** | Önemli düğme yazıları; ana sayfa ve bölüm başlıkları; açıklamalar, form etiketleri ve alt bilgi. Alanları arama kutusuyla bulabilirsin. Menü yazıları **Menü** bölümünden düzenlenir. |
| **Görseller** | Site logosu, ana görsel, giriş/kayıt sahneleri, topluluk arka planı ve buton/form çerçeveleri gibi arayüz görselleri. |
| **Haberler** | Haber ekleme, kaldırma, sıralama; başlık, kategori, kısa açıklama, görsel, okuma süresi ve yazı metni. Paragrafların arasına boş satır koy. |
| **Karakter Sınıfları** | Sınıf adları, karakter görselleri, sınıf sembolleri, özellikler, başlık ve açıklamalar. |
| **Dünya Galerisi** | Sahne ekleme, kaldırma ve sıralama; görseller, numaralar, başlık ve açıklamalar. |
| **Sık Sorulanlar** | Soru ve yanıt ekleme, düzenleme, kaldırma ve sıralama. |
| **Giriş ve Kayıt** | Sağ formun metinleri, sol sahnenin metinleri ve her ekrana ait ayrı karakter görseli. |
| **Bağlantılar** | Oyun indirme, topluluk ve destek adresleri. Boş bırakılan adreslerde sitenin varsayılan davranışı kullanılır. |

Haber, sınıf ve sahnelerdeki **kimlik/bağlantı adı** benzersiz olmalıdır. Kısa bir Latin harf, rakam, tire ve alt çizgi birleşimi kullan; örneğin `yeni-yolculuk`. Yukarı/aşağı oklar kayıtların sırasını değiştirir. Bir sınıf ve bir dünya sahnesi sitede bulunmaya devam etmelidir.

Özel sayfalar, şablonlar ve ana sayfa düzeni için [Sayfa Düzenleyici kılavuzuna](SAYFA_DUZENLEYICI.md) bak. Yeni sayfalar önce taslak olarak oluşturulur; yayına açılıp kaydedilene kadar ziyaretçilere gösterilmez.

## Görsel yükleme ve kaydetme

1. İlgili bölümde **Görsel yükle** düğmesine bas veya görsel adresini yaz.
2. PNG, JPG, WebP ve AVIF desteklenir. Bir dosya en çok 10 MB olabilir. SVG yüklenmez.
3. Genel görsellerde yatay/dikey odakla önemli kısmı kadraja getir. **Alanı kapla** alanı doldurur; **Tamamını göster** görseli kırpmadan sığdırır. Karakter ve haber kartlarında görsel kendi tasarım alanına yerleşir.
4. **Önizleme** ile görünümü kontrol et.
5. Sağ üstteki **Siteyi Kaydet** düğmesine bas. Kayıt tamamlandığında durum göstergesi **Tüm değişiklikler kaydedildi** olur.

Dosya yükleme, dosyayı sunucuya aktarır; görselin yayındaki içeriğe bağlanması ayrıca kayıt gerektirir. **Varsayılanı kullan**, ilgili görselin siteyle gelen başlangıç değerini taslağa getirir. Bu işlem de kaydedildikten sonra herkes için geçerli olur.

Panel içinden içerik kaydetmek için siteyi yeniden derlemek veya yayımlamak gerekmez. Kod ve başlangıç dosyası değişikliklerinde normal derleme/yayın işlemi gerekir.

## Önizleme ve taslaklar

**Önizleme**, kaydedilmemiş düzenlemeleri panelin yanındaki site görünümüne uygular. **Masaüstü** ve **Mobil** seçenekleriyle kontrol edebilirsin. Giriş ve kayıt bölümünde seçili hesap ekranı açılır. Önizleme, taslağı ziyaretçilere yayımlamaz.

**Geri al** son düzenlemeleri geri getirir; silinen bir kayıt da kaydetmeden önce geri alınabilir. **Taslağı sıfırla**, son kayıtlı içeriğe döner. Kaydedilmemiş değişiklik varken sayfadan çıkış uyarısı gösterilir. Taslak yalnızca açık sayfanın belleğindedir; sayfayı kapatıp kaydedilmemiş değişiklikleri kaybetmemek için önce kaydet veya yedeğini indir.

## Yedek ve kayıt çakışmaları

**Yedek indir**, paneldeki mevcut içeriği JSON dosyası olarak indirir. Kaydedilmemiş taslağı da içerir. Bu dosya metinleri, içerik kayıtlarını ve görsel adreslerini saklar; görsel dosyalarının arşivi değildir. Özgün görsel dosyalarını da kendi klasöründe sakla. Panelde otomatik JSON içe aktarma düğmesi bulunmaz; yedek, gerekirse içerikleri geri taşımak için kullanılabilir.

İki oturum aynı içeriği düzenlerse eski sürüm yeni kaydın üzerine yazılmaz. Çakışma mesajında **Taslağı indir** ile çalışmanı yedekle, ardından **Güncel sürümü yükle** seçeneğini kullan. Bu seçenek açık taslağı sunucudaki içerikle değiştirir; değişikliklerini güncel sürüme yeniden uygulayıp kaydet.

Bağlantı veya kayıt hatasında taslak açık sayfada kalır. Oturum sona ererse yeniden giriş yapmadan önce yedeğini indir; hata mesajı başarılı kayıt anlamına gelmez.

## Oyuncu hesapları

Bu panel site içeriğini yönetir. Oyuncu oluşturma, şifre sıfırlama, oyun hesabı girişi veya oyun sunucusu yönetimi sağlamaz. Normal giriş formundaki sunucu çağrısı şu anda yalnızca özel yönetici girişini doğrular; gerçek oyun hesabı API'si henüz bağlı değildir. Ayrıntılar: [Giriş ve kayıt ekranları](HESAP_EKRANLARI.md).
