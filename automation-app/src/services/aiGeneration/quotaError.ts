/**
 * Google AI (Nano Banana Pro, Veo) ve Kling API'leri, kota/faturalama
 * sorunlarını HTTP 429 (RESOURCE_EXHAUSTED) veya 402/403 (ödeme/izin sorunu)
 * ile bildirir. Bu, uygulamanın sessizce farklı bir davranışa geçmesini değil
 * — net bir Türkçe uyarı göstermesini sağlamak için ortak bir kontrol.
 *
 * Not: Gemini Developer API'de "ücretsiz kota" ile "ücretli çağrı" arasında
 * kod seviyesinde seçim yapılan bir mekanizma yok — bu, API anahtarınızın
 * bağlı olduğu Google Cloud projesinde faturalandırmanın açık olup
 * olmamasıyla belirlenir. Nano Banana Pro ve Veo 3.1 modellerinin Gemini API
 * üzerinde ücretsiz kotası yoktur (yalnızca ücretli); bu fonksiyon en azından
 * bir çağrı başarısız olduğunda bunu anlaşılır şekilde bildirir, hiçbir zaman
 * sessizce tekrar denemez ya da farklı bir davranışa geçmez.
 */
export function describeQuotaOrBillingError(status: number | undefined, message: string): string | null {
  if (status === 429) {
    return `Kota/oran sınırına takıldı (429): ${message}. Google AI Studio / Kling hesabınızın kullanım panelinden kotanızı kontrol edin.`;
  }
  if (status === 402) {
    return `Ödeme gerekli (402): ${message}. Bu model için faturalandırma etkin olmayabilir.`;
  }
  if (status === 403) {
    return `Yetki/faturalandırma hatası (403): ${message}. Google Cloud projenizde faturalandırmanın etkin ve API anahtarının doğru olduğundan emin olun.`;
  }
  return null;
}
