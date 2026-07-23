"use client";

import { useRef, useState } from "react";

type FieldErrors = Record<string, string[]>;

type CreatedProduct = { id: string; name: string };

export function ProductForm({ onCreated }: { onCreated: (product: CreatedProduct) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function handleFilesChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setPreviews((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      return files.map((f) => URL.createObjectURL(f));
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setBanner(null);

    const formData = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/products", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (data.details?.fieldErrors) setErrors(data.details.fieldErrors);
        setBanner({ type: "error", text: data.message ?? "Ürün kaydedilemedi." });
        return;
      }

      setBanner({ type: "success", text: `"${data.product.name}" eklendi, süreç başlatılıyor…` });
      formRef.current?.reset();
      setPreviews((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url));
        return [];
      });
      onCreated({ id: data.product.id, name: data.product.name });
    } catch {
      setBanner({ type: "error", text: "Sunucuya ulaşılamadı." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form ref={formRef} className="card" onSubmit={handleSubmit}>
      <h2>Yeni Ürün Ekle</h2>

      {banner && <p className={`status-banner ${banner.type}`}>{banner.text}</p>}

      <div className="field">
        <label htmlFor="name">Ürün Adı *</label>
        <input id="name" name="name" type="text" required />
        {errors.name && <span className="field-error">{errors.name.join(", ")}</span>}
      </div>

      <div className="field">
        <label htmlFor="sourceUrl">Ürün Linki (varsa)</label>
        <input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://..." />
        {errors.sourceUrl && <span className="field-error">{errors.sourceUrl.join(", ")}</span>}
      </div>

      <div className="field">
        <label htmlFor="category">Kategori</label>
        <input id="category" name="category" type="text" placeholder="ör. Duruş Destekleyici Sütyen" />
      </div>

      <div className="field">
        <label htmlFor="description">Kısa Açıklama</label>
        <textarea id="description" name="description" placeholder="Ürünün öne çıkan özellikleri..." />
      </div>

      <div className="field">
        <label htmlFor="images">Kaynak Görsel(ler) *</label>
        <input
          id="images"
          name="images"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          required
          onChange={handleFilesChange}
        />
        {previews.length > 0 && (
          <div className="thumb-row">
            {previews.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`Önizleme ${i + 1}`} className="thumb" />
            ))}
          </div>
        )}
      </div>

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? "Kaydediliyor..." : "Ürünü Kaydet ve Süreci Başlat"}
      </button>
    </form>
  );
}
