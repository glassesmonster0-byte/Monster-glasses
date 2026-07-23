"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";

type Product = {
  id: string;
  name: string;
  category: string | null;
  sourceImagePaths: string[];
  createdAt: string;
};

export type ProductHistoryHandle = { refresh: () => void };

export const ProductHistory = forwardRef<ProductHistoryHandle>(function ProductHistory(_props, ref) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      setProducts(data.products ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useImperativeHandle(ref, () => ({ refresh: load }));

  return (
    <section className="card">
      <h2>Geçmiş</h2>
      {loading && products.length === 0 ? (
        <p>Yükleniyor...</p>
      ) : products.length === 0 ? (
        <p>Henüz ürün eklenmedi.</p>
      ) : (
        <table className="history">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Kategori</th>
              <th>Görsel</th>
              <th>Eklenme Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.category ?? "—"}</td>
                <td>
                  <span className="badge">{p.sourceImagePaths.length} görsel</span>
                </td>
                <td>{new Date(p.createdAt).toLocaleString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
});
