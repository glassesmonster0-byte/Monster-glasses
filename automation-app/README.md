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
| `SHOPIFY_STORE_DOMAIN`, `SHOPIFY_ADMIN_API_ACCESS_TOKEN` | Shopify admin > Settings > Apps and sales channels > Develop apps > Create an app (Admin API scopes: `write_products`, `read_products`) | Modül 3 (ve Modül 4'ün üretilen içeriği barındırması için) |
| `GOOGLE_AI_API_KEY` | **aistudio.google.com/apikey** — "Create API key" ile alınır | Modül 4 — görsel (Nano Banana Pro / `gemini-3-pro-image-preview`) ve video (Veo 3.1 / `veo-3.1-generate-001`) |
| `KLING_ACCESS_KEY`, `KLING_SECRET_KEY` | **app.klingai.com** > hesap ayarları > API Key sayfası (access key + secret key çifti oluşturun) | Modül 4 — video (Kling, panelden seçilebilir alternatif) |
| `META_PAGE_ACCESS_TOKEN`, `META_FACEBOOK_PAGE_ID`, `META_INSTAGRAM_BUSINESS_ACCOUNT_ID` | developers.facebook.com'da bir uygulama oluşturup Instagram Business hesabınızı ve Facebook Sayfanızı bağlayarak | Modül 5 |

### Google AI (Nano Banana Pro + Veo 3.1) — önemli maliyet notu

Bu iki model **Gemini Developer API üzerinde ücretsiz kotaya sahip değildir** — her çağrı, API anahtarınızın bağlı olduğu Google Cloud projesinde faturalandırma etkinse ücretli olarak çalışır, değilse hata döner. API seviyesinde "önce ücretsiz dene, kota bitince ücretliye geç" diye bir mekanizma yok (bu, proje ayarı, kod değil); bu yüzden uygulama hiçbir zaman sizi haberdar etmeden ücretli bir çağrı yapmaz ya da farklı bir davranışa geçmez — kota/faturalama hatası olduğunda panelde net bir Türkçe mesaj gösterir (`src/services/aiGeneration/quotaError.ts`). Ücretsiz denemek isterseniz Google AI Studio arayüzünden (aistudio.google.com) prototipleme yapabilirsiniz; API üzerinden bu modelleri kullanmak için faturalandırma şart.

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

### Modül 4 — AI Görsel/Video Üretimi (doğrudan Google + Kling) ✅

Higgsfield gibi bir aracı servis **yok** — görsel doğrudan Google'ın Gemini Developer API'sine (`@google/genai` resmi SDK'sı), video ise seçtiğiniz sağlayıcıya göre doğrudan Google'a (Veo 3.1) ya da doğrudan Kling'e (`@ai-sdk/klingai` resmi Vercel AI SDK sağlayıcısı) bağlanıyor.

1. `aistudio.google.com/apikey`'den bir anahtar alıp `.env.local`'e `GOOGLE_AI_API_KEY` olarak girin. **Faturalandırmanın etkin olduğu bir Google Cloud projesine bağlı olmalı** — yukarıdaki maliyet notuna bakın.
2. (Opsiyonel, video için alternatif) `app.klingai.com`'dan bir access key/secret key çifti alıp `KLING_ACCESS_KEY` / `KLING_SECRET_KEY` olarak girin.
3. Panelin sağ üstündeki **"Video:"** dropdown'ından "Google Veo 3.1" veya "Kling" seçin — bu tercih kalıcıdır (veritabanında saklanır) ve bundan sonraki tüm video üretimlerinde kullanılır.
4. Fiyat onayı → Shopify senkronizasyonu başarılı olduğunda içerik üretimi otomatik tetiklenir. Panelde "Üretilen Reklam İçerikleri" altında bir görsel (Nano Banana Pro) ve bir video (seçili sağlayıcı) kartı, her biri "Üretiliyor…" durumuyla belirir. Video üretimi (özellikle Veo) birkaç dakika sürebilir.
5. Üretim bitince kart içinde görseli/videoyu ve kullanılan prompt'u görmelisiniz; "Onayla / Reddet / Yeniden Üret" butonları aktif olmalı.
6. **Neden Shopify'a yükleniyor?** Üretilen içerik, Instagram/Facebook'a paylaşılabilmesi (Meta Graph API herkese açık bir URL ister) ve panelde önizlenebilmesi için otomatik olarak Shopify'ın dosya deposuna (`fileCreate`) yükleniyor — lokal uygulamanın kendi herkese açık bir adresi olmadığından, zaten bağlı olduğunuz Shopify mağazası bu amaçla kullanılıyor. Bu adım için Shopify'ın da yapılandırılmış olması gerekir (Modül 3).
7. Yanlış kimlik bilgileriyle, kota/faturalama sorunuyla veya yapılandırma eksikken deneyin — her kart bağımsız olarak "failed" durumuna düşüp anlaşılır bir hata mesajı göstermeli (biri başarısız olsa diğeri yine de denenir), "Yeniden Üret" butonu çalışmalı.
8. Video sağlayıcısını değiştirip aynı ürün için "Yeniden Üret" deneyin — bir sonraki video üretiminin yeni seçili sağlayıcıyı (`provider`/`model` sütunlarında görünür) kullandığını doğrulayın.
9. Doğrudan API testi (Shopify adımını atlayıp sadece içerik üretimini test etmek için):
   ```bash
   curl http://localhost:3000/api/settings/video-provider
   curl -X POST http://localhost:3000/api/settings/video-provider -H "Content-Type: application/json" -d '{"provider":"kling"}'
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/content
   curl http://localhost:3000/api/products/<PRODUCT_ID>/content
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/content/<CONTENT_ID>/approve
   ```

### Modül 5 — Sosyal Medya Paylaşımı (Instagram + Facebook) ✅

1. developers.facebook.com'da bir uygulama oluşturup Instagram Business hesabınızı ve Facebook Sayfanızı bağlayın; bir Sayfa erişim token'ı (`META_PAGE_ACCESS_TOKEN`), Sayfa ID'si (`META_FACEBOOK_PAGE_ID`) ve Instagram İşletme Hesabı ID'sini (`META_INSTAGRAM_BUSINESS_ACCOUNT_ID`) `.env.local`'e girin.
2. Panelde sağ üstte "Meta: bağlı (Sayfa adınız)" görünmeli. Kontrol: `curl http://localhost:3000/api/meta/status`
3. Bir ürünün hem görselini hem videosunu onaylayın (ikisi de "ready" durumdan çıkıp karara bağlanınca, yani her ikisi de onayla/reddet ile işaretlenince) — bekleyen içerik kalmadığı ve en az bir onay olduğu anda paylaşım otomatik başlar.
4. Panelde "Sosyal Medya Paylaşımları" bölümünde görsel için Instagram gönderi + story + Facebook fotoğraf, video için Instagram reels + Facebook video satırlarını görmelisiniz; her biri "paylaşıldı" ya da hata mesajıyla görünür.
5. Instagram/Facebook'ta gönderilerin gerçekten yayınlandığını, caption ve hashtag'lerin marka tonuna uygun olduğunu doğrulayın.
6. Yanlış/eksik token ile deneyin — "bağlı değil" rozeti ve her platform/format satırı için ayrı hata mesajı + "Başarısız Paylaşımları Tekrar Dene" butonu görünmeli.
7. Doğrudan API testi:
   ```bash
   curl -X POST http://localhost:3000/api/products/<PRODUCT_ID>/social-post
   curl http://localhost:3000/api/products/<PRODUCT_ID>/social-post
   ```

### Modül 6 — Panel / Dashboard ✅

1. Birkaç ürün ekleyip süreçlerini farklı noktalarda bırakın (biri sadece fiyat onayında kalsın, biri Shopify hatasında kalsın, vb.).
2. "Kapat" butonuna basıp Süreç Durumu panelini kapatın — "Geçmiş" tablosunda her ürünün güncel durumu (`Durum` sütunu) ve varsa onaylı fiyatı görünmeli.
3. Geçmiş tablosundaki herhangi bir satıra tıklayın — o ürünün Süreç Durumu paneli, kaldığı yerden (ilgili onay/tekrar dene butonlarıyla) tekrar açılmalı.
4. Bu, tamamen lokal ve sadece sizin kullanımınız için bir panel — dışarıdan erişilebilir bir URL'i yok, sadece `localhost`'ta çalışıyor.

## Genel Not

Modül 4 ve 5'teki dış servis entegrasyonları (Google Gemini/Veo, Kling, Meta Graph API) gerçek API anahtarları olmadan bu ortamda uçtan uca test edilemedi — bunun yerine (a) resmi SDK'ların (`@google/genai`, `@ai-sdk/klingai`) TypeScript tip tanımları ve README'leri üzerinden model adları/endpoint şekilleri doğrulandı, (b) eksik yapılandırma durumunda uygulamanın çökmeden anlaşılır hata gösterdiği ve "tekrar dene" akışlarının çalıştığı uçtan uca test edildi. Gerçek anahtarlarınızı girdikten sonra her modülün "Modül modül test" bölümündeki adımları izleyerek doğrulamanızı öneririz.
