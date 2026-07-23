"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { WORKFLOW_STATUS_LABELS } from "@/lib/workflowLabels";

type Product = {
  id: string;
  name: string;
  category: string | null;
  sourceImagePaths: string[];
  createdAt: string;
  workflowStatus: string | null;
  approvedPrice: number | null;
};

export type ProductHistoryHandle = { refresh: () => void };

function formatTRY(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

export const ProductHistory = forwardRef<ProductHistoryHandle, { onSelect: (product: { id: string; name: string }) => void }>(
  function ProductHistory({ onSelect }, ref) {
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
                <th>Fiyat</th>
                <th>Durum</th>
                <th>Eklenme Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => onSelect({ id: p.id, name: p.name })}
                  style={{ cursor: "pointer" }}
                  title="Süreç detayını görüntülemek için tıklayın"
                >
                  <td>{p.name}</td>
                  <td>{p.category ?? "—"}</td>
                  <td>{p.approvedPrice != null ? formatTRY(p.approvedPrice) : "—"}</td>
                  <td>
                    <span className="badge">
                      {p.workflowStatus ? (WORKFLOW_STATUS_LABELS[p.workflowStatus] ?? p.workflowStatus) : "başlamadı"}
                    </span>
                  </td>
                  <td>{new Date(p.createdAt).toLocaleString("tr-TR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    );
  },
);
