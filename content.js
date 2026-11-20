export const galleryCards = [
  { title: "Gökyüzü Gözlemleri", image: "gallery-observations.webp", alt: "Festival konukları teleskoplarla gökyüzünü inceliyor" },
  { title: "Söyleşi ve Atölyeler", image: "gallery-workshops.webp", alt: "Açık havada festival söyleşisi ve atölye" },
  { title: "Olimpos'ta Yaşam", image: "gallery-life.webp", alt: "Olimpos'ta yıldızların altında festival yaşamı" },
  { title: "Geçmiş Festivaller", image: "gallery-history.webp", alt: "Samanyolu altında gökyüzünü izleyen festival katılımcısı" },
];

export const supporters = [
  { name: "KOZMİK ANAFOR", logo: "kozmik-anafor.png", url: "https://www.kozmikanafor.com/" },
  { name: "ASTRAPERA", logo: "astrapera.png", url: "https://astrapera.com/" },
  { name: "EVRİM AĞACI", logo: "evrim-agaci.png", url: "https://evrimagaci.org/" },
  { name: "HYPATIA BİLİM", logo: "hypatia.png", url: "https://www.hypatiabilimfestival.com/" },
  { name: "TEK ÇARE UZAY", logo: "tek-care-uzay.png", url: null },
  { name: "AÇIK BİLİM", logo: "acik-bilim.png", url: "https://www.acikbilim.com/" },
  { name: "UZAY ÇAĞINDA YOLCULUK", logo: "uzay-caginda-yolculuk.png", url: "https://uzaycaginda.org/" },
  { name: "YALANSAVAR", logo: "yalansavar.png", url: "https://yalansavar.org/" },
  { name: "GERÇEK BİLİM", logo: "gercek-bilim.png", url: "https://www.gercekbilim.com/" },
  { name: "KAYIP RIHTIM", logo: "kayip-rihtim.png", url: "https://kayiprihtim.com/" },
  { name: "ANADOLU İZCİLİK FEDERASYONU", logo: "anadolu-izcilik.png", url: "https://www.aif.org.tr/" },
  { name: "DİJİTAL X", logo: "dijital-x.png", url: "https://dijitalix.com/" },
  { name: "BİLİM NE GÜZEL LAN", logo: "bilim-ne-guzel-lan.png", url: "https://bilimneguzellan.net/" },
];

export const locationUrl = "https://www.google.com/maps/place/Olympos+DonKi%C5%9Fot+Pansiyon/@36.3846745,30.4477961,17z/data=!3m1!4b1!4m9!3m8!1s0x14c236da8fca4981:0x79dd71e3583a128e!5m2!4m1!1i2!8m2!3d36.3846745!4d30.4477961!16s%2Fg%2F113fjj8ng?entry=ttu&g_ep=EgoyMDI2MTAyOC4wIKXMDSoASAFQAw%3D%3D";
// Admin-panel-ready content boundary; the management UI can edit this value later.
export const siteSettings = { locationUrl, newsletterEndpoint: "", turnstileSiteKey: "", explorationFactsEndpoint: "" };

export const featuredSupporters = supporters.slice(0, 3);
export const marqueeSupporters = supporters.slice(3);

// Default published cards. A configured panel endpoint can supply replacements.
export const explorationFacts = [
  {"id": "uzay-neptun", "title": "Neptün’deki Rüzgârlar", "text": "Neptün, Güneş Sistemi’nin en güçlü rüzgârlarından bazılarına ev sahipliği yapar. Atmosferindeki dev fırtınalar, gezegenin mavi bulutları arasında izlenebilir."},
  {"id": "uzay-kuyruklu-yildiz", "title": "Kuyruklu Yıldızların Kuyruğu", "text": "Kuyruklu yıldızlar Güneş’e yaklaştıklarında gaz ve toz salar. Kuyrukları genellikle Güneş’ten uzağa doğru uzanır; bu yön, hareket yönleriyle aynı olmak zorunda değildir."},
  {"id": "uzay-01", "title": "Işığın Hızı", "text": "Işık, boşlukta saniyede yaklaşık 300.000 kilometre yol alır. Bu hızla Dünya'nın çevresini bir saniyede yaklaşık 7,5 kez dolaşabilirsiniz."},
  {"id": "uzay-02", "title": "Güneş'ten Gelen Işık", "text": "Güneş ile Dünya arasında yaklaşık 150 milyon kilometre bulunur. Güneş ışığının bize ulaşması 8 dakika 20 saniye sürer."},
  {"id": "uzay-03", "title": "Bir Işık Yılı Ne Kadar?", "text": "Işık yılı bir zaman değil, mesafe birimidir. Işığın bir yılda katettiği yol yaklaşık 9,46 trilyon kilometredir."},
  {"id": "uzay-04", "title": "En Yakın Yıldız", "text": "Güneş'ten sonra bize en yakın yıldız Proxima Centauri'dir. Yaklaşık 4,24 ışık yılı uzaklıktadır."},
  {"id": "uzay-05", "title": "Komşu Galaksimiz", "text": "Andromeda Galaksisi yaklaşık 2,5 milyon ışık yılı uzaklıktadır. Bugün gördüğümüz ışığı, Dünya'ya doğru yolculuğuna 2,5 milyon yıl önce başladı."},
  {"id": "uzay-06", "title": "Samanyolu'nun Büyüklüğü", "text": "İçinde yaşadığımız Samanyolu Galaksisi yaklaşık 100.000 ışık yılı genişliğindedir. Işık bile galaksimizin bir ucundan diğerine 100.000 yılda ulaşır."},
  {"id": "uzay-07", "title": "Gözlemlenebilir Evren", "text": "Gözlemlenebilir evrenin çapı yaklaşık 92–93 milyar ışık yılı olarak hesaplanır. Bu, tüm evrenin fiziksel sınırının bulunduğu anlamına gelmez."},
  {"id": "uzay-08", "title": "Geçmişe Bakmak", "text": "Uzaktaki bir galaksiye baktığımızda onun geçmişini görürüz. Çünkü ışığın o galaksiden bize ulaşması milyonlarca, hatta milyarlarca yıl sürebilir."},
  {"id": "uzay-09", "title": "Galaktik Yolculuk", "text": "Güneş, Samanyolu'nun merkezi etrafındaki bir turunu yaklaşık 230 milyon yılda tamamlar. Dünya oluştuğundan beri bu yolculuğu yaklaşık 20 kez gerçekleştirdi."},
  {"id": "uzay-10", "title": "Evren Kaç Yaşında?", "text": "Evrenin yaşı yaklaşık 13,8 milyar yıl olarak hesaplanıyor. Güneş Sistemi ise yaklaşık 4,6 milyar yıl önce oluştu."},
  {"id": "uzay-11", "title": "Evrenin İlk Işığı", "text": "Büyük Patlama'dan yaklaşık 380.000 yıl sonra serbestçe yayılmaya başlayan ışığı bugün hâlâ gözlemleyebiliyoruz. Buna kozmik mikrodalga arka plan ışıması deniyor."},
  {"id": "uzay-12", "title": "Görünmeyen Evren", "text": "Evrenin yalnızca yaklaşık %5'i bildiğimiz normal maddeden oluşuyor. Geri kalanının yaklaşık %27'si karanlık madde, %68'i ise karanlık enerji."},
  {"id": "uzay-13", "title": "Hızlanan Evren", "text": "Evren yalnızca genişlemiyor; genişlemesi de hızlanıyor. Bilim insanları bu hızlanmayı açıklamak için karanlık enerji kavramını kullanıyor."},
  {"id": "uzay-14", "title": "Kozmik Ağ", "text": "Galaksiler evrene rastgele dağılmıyor. Devasa boşlukları çevreleyen, milyonlarca ışık yılı boyunca uzanan kozmik bir ağ oluşturuyorlar."},
  {"id": "uzay-15", "title": "Kütleçekimsel Mercek", "text": "Büyük kütleli galaksiler ve galaksi kümeleri, arkalarındaki cisimlerden gelen ışığın yolunu bükebilir. Böylece doğal bir büyüteç gibi davranırlar."},
  {"id": "uzay-16", "title": "Kuasarlar", "text": "Kuasarlar, merkezlerinde aktif süper kütleli kara delikler bulunan galaksilerin son derece parlak çekirdekleridir. Bazıları, bulundukları galaksinin yıldızlarının toplamından daha parlaktır."},
  {"id": "uzay-17", "title": "Evrenin Deniz Fenerleri", "text": "Pulsarlar, hızla dönen nötron yıldızlarıdır. Bazıları saniyede yüzlerce kez dönerek uzaya düzenli radyasyon atımları gönderir."},
  {"id": "uzay-18", "title": "Magnetarlar", "text": "Magnetarlar, olağanüstü güçlü manyetik alanlara sahip nötron yıldızlarıdır. Manyetik alanları Dünya'nınkinden trilyonlarca kat güçlü olabilir."},
  {"id": "uzay-19", "title": "Bir Küp, Bir Milyar Ton", "text": "Nötron yıldızları inanılmaz derecede yoğundur. Bir şeker küpü büyüklüğündeki nötron yıldızı maddesi, Dünya'da yaklaşık bir milyar ton ağırlığında olabilir."},
  {"id": "uzay-20", "title": "Geri Dönüşü Olmayan Sınır", "text": "Kara deliğin olay ufku, geri dönüşü olmayan sınırdır. Bu sınırın içinden ışık bile dışarı kaçamaz."},
  {"id": "uzay-21", "title": "Uzay-Zamanın Dalgaları", "text": "2015 yılında iki kara deliğin birleşmesinden kaynaklanan kütleçekim dalgaları ilk kez doğrudan tespit edildi. Böylece uzay-zamandaki dalgalanmalar ölçülebildi."},
  {"id": "uzay-22", "title": "Altın Nereden Geliyor?", "text": "Altın ve platin gibi ağır elementlerin bir kısmı, nötron yıldızlarının çarpışması sırasında oluşur. Evrenin en değerli maddeleri kozmik felaketlerden doğabilir."},
  {"id": "uzay-23", "title": "Güneş'in Enerjisi", "text": "Güneş'in çekirdeğinde hidrojen atomlarının çekirdekleri birleşerek helyuma dönüşür. Nükleer füzyon adı verilen bu süreç, Güneş'in enerjisini üretir."},
  {"id": "uzay-24", "title": "İki Güneşli Gezegenler", "text": "Bazı gezegenler tek bir yıldızın değil, iki yıldızın çevresinde dolanır. Bu dünyalarda gökyüzünde iki ayrı güneş görülebilir."},
  {"id": "uzay-25", "title": "Başıboş Gezegenler", "text": "Bazı gezegenler hiçbir yıldızın yörüngesinde bulunmaz. Başıboş gezegenler olarak adlandırılan bu dünyalar, galaksinin içinde tek başlarına yolculuk eder."},
  {"id": "uzay-26", "title": "Venüs’te Dönüş ve Yıl", "text": "Venüs, yıldızlara göre kendi ekseni etrafındaki bir turunu yaklaşık 243 Dünya gününde, Güneş çevresindeki turunu yaklaşık 225 günde tamamlar. Venüs’te bir güneş günü ise yaklaşık 117 Dünya günüdür."},
  {"id": "uzay-27", "title": "Yan Yatan Gezegen", "text": "Uranüs'ün dönme ekseni yaklaşık 98 derece eğiktir. Bu nedenle gezegen, Güneş çevresinde âdeta yan yatmış biçimde döner."},
  {"id": "uzay-28", "title": "Metan Denizleri", "text": "Satürn'ün uydusu Titan'da nehirler, göller ve denizler bulunur. Ancak bunlar sudan değil, büyük ölçüde sıvı metan ve etandan oluşur."},
  {"id": "uzay-29", "title": "Buzun Altındaki Okyanus", "text": "Jüpiter'in uydusu Europa'nın kilometrelerce kalınlıktaki buz kabuğunun altında, küresel bir sıvı su okyanusu bulunduğuna dair güçlü kanıtlar var."},
  {"id": "uzay-30", "title": "Uzaya Su Püskürten Uydu", "text": "Satürn'ün küçük uydusu Enceladus, buzlu yüzeyindeki çatlaklardan uzaya su buharı ve buz parçacıkları püskürtür. Kaynağı, yüzeyinin altındaki okyanustur."},
];
