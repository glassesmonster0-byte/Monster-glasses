# LIAXIS Ürün Otomasyon Paneli

Bu, **yalnızca lokal olarak sizin çalıştıracağınız** bir dahili otomasyon panelidir — herkese açık bir web sitesi değildir. Bir ürün girdiğinizde uygulama fiyat araştırması yapar, Shopify mağazanızı günceller, AI ile reklam görseli/videosu üretir ve (onayınızdan sonra) Instagram/Facebook'a paylaşır.

## Mimari

- **Next.js 16 (App Router, TypeScript)** — hem panel arayüzü hem `/api/*` route handler'ları tek projede.
- **SQLite** (`better-sqlite3` + Drizzle ORM) — `data/liaxis.db`. Kurulum gerektirmez.
- **Modüler servis katmanı** (`src/services/*`) — her adım (fiyat araştırma, Shopify, AI üretim, sosyal medya) ayrı bir modül; sağlayıcı değişse de orkestrasyon kodu değişmez.
- Yüklenen kaynak görseller ve üretilen içerikler `data/media/` altında saklanır (git'e girmez).

## Kurulum

```bash
cd automation-app
npm install
cp .env.example .env.local   # ve gerçek API anahtarlarınızı girin
npm run dev
```

Panel `http://localhost:3000` adresinde açılır. Sadece localhost'ta dinler, dışarıdan erişilemez.

İlk çalıştırmada veritabanı ve migration'lar otomatik uygulanır (`drizzle/` klasöründeki SQL dosyaları `src/db/client.ts` tarafından açılışta çalıştırılır).

## Gerekli API anahtarları

`.env.example` dosyasında hepsi listelidir; hiçbiri koda gömülü değildir. Bir modülü henüz yapılandırmadıysanız panel ilgili adımda "bağlı değil" durumunu gösterir, uygulama çökmez.

| Anahtar | Nereden alınır | Hangi modül |
|---|---|---|
| `SERPAPI_API_KEY` | serpapi.com — Google Shopping sonuçları için | Modül 2 (fiyat araştırma) |
| `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | Shopify admin > Settings > Apps and sales channels > Develop apps > Create an app (Admin API scopes: `write_products`, `read_products`) | Modül 3 |
| `HIGGSFIELD_API_KEY` | higgsfield.ai hesabınızdan | Modül 4 (görsel: Nano Banana Pro, video: Kling) |
| `META_PAGE_ACCESS_TOKEN`, `META_FACEBOOK_PAGE_ID`, `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` | developers.facebook.com'da bir uygulama oluşturup Instagram Business hesabınızı ve Facebook Sayfanızı bağlayarak | Modül 5 |

## Modül modül test

### Modül 1 — Ürün Girişi ✅

1. `npm run dev` çalıştırıp `http://localhost:3000` açın.
2. "Yeni Ürün Ekle" formuna ürün adı ve en az bir görsel girip kaydedin.
3. Formun altında yeşil bir onay mesajı ve "Geçmiş" tablosunda yeni satırı görmelisiniz.
4. Boş ürün adıyla veya görsel eklemeden kaydetmeyi deneyin — kırmızı hata mesajı görünmeli, kayıt oluşmamalı.
5. API'yi doğrudan da test edebilirsiniz:
   ```bash
   curl -X POST http://localhost:3000/api/products \
     -F "name=Test Ürünü" \
     -F "images=@/path/to/gorsel.jpg;type=image/jpeg"
   curl http://localhost:3000/api/products
   ```

### Modül 2 — Fiyat Araştırması ✅

1. `.env.local` içine gerçek bir `SERPAPI_API_KEY` girin (serpapi.com'da ücretsiz plan da yeterli, ~100 arama/ay).
2. Panelde yeni bir ürün ekleyin — kayıt olur olmaz süreç otomatik olarak "Fiyat araştırması yapılıyor…" durumuna geçer.
3. Birkaç saniye içinde bulunan fiyatların listesi, medyan fiyat, kâr marjı (%150 varsayılan) ve önerilen satış fiyatı görünmeli.
4. "Önerilen Fiyatı Onayla" veya manuel bir fiyat girip "Manuel Fiyatla Onayla" ile devam edin — onaylanan fiyat yeşil bir banner'da gösterilmeli ve durum "Shopify güncelleniyor…" adımına geçmeli (Modül 3 tamamlandığında gerçek senkronizasyonu tetikleyecek).
5. **API anahtarı olmadan test:** `SERPAPI_API_KEY` boşken de deneyin — "Eksik yapılandırma" hatası görünmeli ama panel çökmemeli, ve "manuel fiyat gir" alanı her zaman kullanılabilir olmalı.
6. Doğrudan API testi:
   ```bash
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/price-research
   curl http://localhost:3000/api/products/<PRODUCT_ID>/price-research
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/price-research/approve \
     -H "Content-Type: application/json" -d '{"approvedPrice": 499}'
   ```

### Modül 3 — Shopify Entegrasyonu ✅

1. Shopify admin panelinizde **Settings > Apps and sales channels > Develop apps > Create an app** ile bir custom app oluşturun; Admin API scope olarak en az `write_products`, `read_products` verin ve Admin API access token'ı `.env.local`'e (`SHOPIFY_ADMIN_API_ACCESS_TOKEN`) ve mağaza domaininizi (`SHOPIFY_STORE_DOMAIN`, ör. `liaxis.myshopify.com`) girin.
2. Paneli açtığınızda sağ üstte "Shopify: bağlı (mağaza adınız)" görünmeli. Görünmüyorsa doğrudan kontrol edin: `curl http://localhost:3000/api/shopify/status`
3. Yeni bir ürün ekleyip fiyatı onaylayın — onay anında Shopify senkronizasyonu otomatik tetiklenir. Birkaç saniye içinde "Shopify Senkronizasyonu" bölümünde "Ürün oluşturuldu" mesajını görmelisiniz; Shopify admin'de ürünün gerçekten oluştuğunu doğrulayın (başlık, fiyat, görsel, ACTIVE durumu).
4. Aynı ürünü tekrar süreçten geçirirseniz (ör. `POST /api/products/<id>/shopify`) bu sefer **güncelleme** (productUpdate) çalışmalı — Shopify'da yeni bir ürün değil, var olanın güncellendiğini doğrulayın.
5. Yanlış/eksik token ile deneyin — "bağlı değil" rozeti ve senkronizasyon adımında kırmızı hata + "Shopify'a Tekrar Gönder" butonu görünmeli; buton tekrar denemeyi tetiklemeli.
6. Opsiyonel: `SHOPIFY_DEFAULT_COLLECTION_ID` ve `SHOPIFY_LOCATION_ID` girerek koleksiyon ataması ve envanter davranışını test edin.

### Modül 4 — AI Görsel/Video Üretimi (Higgsfield) ✅

1. higgsfield.ai dashboard'unuzdan bir KEY_ID/KEY_SECRET çifti alıp `.env.local`'e (`HIGGSFIELD_KEY_ID`, `HIGGSFIELD_KEY_SECRET`) girin.
2. **Önemli:** `HIGGSFIELD_IMAGE_ENDPOINT` ve `HIGGSFIELD_VIDEO_ENDPOINT` değerlerini dashboard'unuzdaki model kataloğunda ilgili modelin ("Nano Banana Pro", "Kling") API sekmesinde gösterilen tam endpoint string'iyle karşılaştırın — bunlar makul varsayılanlar ama Higgsfield'in genel dokümanına erişemediğimiz için kesinlik garanti edemiyoruz. `src/services/aiGeneration/higgsfieldProvider.ts` içindeki yorumda detay var.
3. Fiyat onayı → Shopify senkronizasyonu başarılı olduğunda içerik üretimi otomatik tetiklenir. Panelde "Üretilen Reklam İçerikleri" altında bir görsel ve bir video kartı, her biri "Üretiliyor…" durumuyla belirir.
4. Üretim bitince kart içinde görseli/videoyu ve kullanılan prompt'u görmelisiniz; "Onayla / Reddet / Yeniden Üret" butonları aktif olmalı.
5. Yanlış kimlik bilgileriyle veya yapılandırma eksikken deneyin — her kart bağımsız olarak "failed" durumuna düşüp hata mesajını göstermeli (biri başarısız olsa diğeri yine de denenir), "Yeniden Üret" butonu çalışmalı.
6. Doğrudan API testi (Shopify adımını atlayıp sadece içerik üretimini test etmek için):
   ```bash
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/content
   curl http://localhost:3000/api/products/<PRODUCT_ID>/content
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/content/<CONTENT_ID>/approve
   ```

_(Modül 5–6 tamamlandıkça bu bölüme test adımları eklenecek.)_
