# MET3 — Canlı atmosfer

`public/atmosphere.js` ve `public/atmosphere.css`, `public/index.html` üzerinden yüklenir. Mevcut görselleri değiştirmeyen, CMS verisi okumayan/yazmayan dekoratif bir katmandır. Yönetici paneli sayfasına yüklenmez; panel içi taslak önizlemelerinde de çalışmaz.

- Sayfa boyunca kızıl kor, yavaş kül ve altın ateş böceği parıltıları; açılış alanında 16–22 saniye aralıkla küçük kıvılcım açılması.
- Küller belirgin kırmızı/kızıl renktedir; ince, farklı boyutlarda parçalar dönerek ve yanlara salınarak süzülür. Altın parıltılar korunur. Parçacık bütçesi artırılmaz.
- Masaüstünde fareyi yaklaşık 80 ms yumuşatmayla izleyen geniş, hafif altın-kızıl ışık vardır. Fare sayfadan çıktığında söner. Ek bir çizim döngüsü oluşturmaz; atmosfer durdurulduğunda ve azaltılmış hareket tercihinde kapanır. Dokunmatik hareketler ışık üretmez.
- Açılış, dünya görseli ve topluluk bölümlerinde yavaş ışık/sis geçişi. Görünmeyen sahnelerin CSS döngüleri durur.
- Tuval fare/touch olaylarını yakalamaz. Başlıklar ve açılış açıklaması/butonları etrafında parçacık çizilmez. Efektler ses üretmez.
- “Atmosferi durdur” tercihi yalnızca ziyaretçinin tarayıcısında saklanır. Bu düğme, Ninja videosunun kendi kontrolünden bağımsızdır.
- Masaüstü: en çok 76 parçacık, 30 FPS, en çok 1.5 piksel oranı. Mobil: 22 parçacık, 24 FPS, 1 piksel oranı; kıvılcım açılması ve sis devre dışı.
- Azaltılmış hareket veya veri tasarrufu tercihi efektleri kapatır. Sekme arka planda, ana içerik görünmüyor, giriş/kayıt ekranı veya bir pencere açıkken çizim döngüsü durur.
- İçerik sıralaması/gizleme, özel sayfalar, bağlantılar, giriş/kayıt, mevcut karakter modülleri ve CMS depolaması korunur. Herhangi bir yeni medya dosyası veya CDN gerekmez.

Yoğunluk/tempo `atmospherePolicy`, parçacık renkleri `draw`, kıvılcım aralığı `burstTime` içinden; ışık/sis renkleri CSS içinden düzenlenebilir. Bu ayarlar şu anda kaynak dosyalarındadır.

Davranış testleri: `node --test lib/atmosphere.test.mjs`. Testler erişilebilirlik ve mobil bütçeleri, tek çizim döngüsü, durdurma/yeniden başlatma, sayfa yaşam döngüsü, önizleme ve Canvas yokluğu davranışlarını kapsar.
