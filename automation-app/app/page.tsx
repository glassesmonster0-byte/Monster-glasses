"use client";

import { useRef, useState } from "react";
import { ProductForm } from "@/components/ProductForm";
import { ProductHistory, ProductHistoryHandle } from "@/components/ProductHistory";
import { WorkflowPanel } from "@/components/WorkflowPanel";

export default function Home() {
  const historyRef = useRef<ProductHistoryHandle>(null);
  const [activeProduct, setActiveProduct] = useState<{ id: string; name: string } | null>(null);

  async function handleCreated(product: { id: string; name: string }) {
    historyRef.current?.refresh();
    setActiveProduct(product);
    // Süreç otomatik başlar: kullanıcının tek işi ürünü girmekti.
    await fetch(`/api/products/${product.id}/price-research`, { method: "POST" });
  }

  return (
    <>
      <ProductForm onCreated={handleCreated} />
      {activeProduct && <WorkflowPanel productId={activeProduct.id} productName={activeProduct.name} />}
      <ProductHistory ref={historyRef} />
    </>
  );
}
