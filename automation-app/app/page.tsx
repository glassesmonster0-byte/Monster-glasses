"use client";

import { useRef } from "react";
import { ProductForm } from "@/components/ProductForm";
import { ProductHistory, ProductHistoryHandle } from "@/components/ProductHistory";

export default function Home() {
  const historyRef = useRef<ProductHistoryHandle>(null);

  return (
    <>
      <ProductForm onCreated={() => historyRef.current?.refresh()} />
      <ProductHistory ref={historyRef} />
    </>
  );
}
