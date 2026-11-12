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
export const siteSettings = { locationUrl, newsletterEndpoint: "", turnstileSiteKey: "" };

export const featuredSupporters = supporters.slice(0, 3);
export const marqueeSupporters = supporters.slice(3);
