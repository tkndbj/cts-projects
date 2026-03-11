"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { ProjectItem } from "@/types";

export default function ProjectItems() {
  const router = useRouter();
  const { id } = useParams();

  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const snapshot = await getDocs(collection(db, "projects", id as string, "items"));
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ProjectItem[];
    setItems(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = async (itemId: string) => {
    if (!confirm("Bu öğeyi silmek istediğinize emin misiniz?")) return;
    await deleteDoc(doc(db, "projects", id as string, "items", itemId));
    await fetchItems();
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-montserrat)]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="text-[11px] text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
          >
            &larr; Projeler
          </button>
          <button
            onClick={() => router.push(`/admin/dashboard/projects/${id}/items/new`)}
            className="px-5 py-2 text-[11px] font-semibold uppercase tracking-widest bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            + Yeni Öğe
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 mb-8">Proje Öğeleri</h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-300 text-sm py-16">Henüz öğe eklenmedi.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">
                    {item.fields?.[0]?.title || "Başlıksız öğe"}
                  </span>
                  <span className="text-[11px] text-gray-400 mt-0.5">
                    {item.fields?.length || 0} alan
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push(`/admin/dashboard/projects/${id}/items/${item.id}`)}
                    className="text-[11px] font-medium uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                  >
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-[11px] font-medium uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors"
                  >
                    Sil
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
