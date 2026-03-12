"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, getDocs, deleteDoc, doc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { ProjectItem } from "@/types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({
  item,
  onEdit,
  onDelete,
}: {
  item: ProjectItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-300 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 touch-none"
          aria-label="Sıralamak için sürükle"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">
            {item.fields?.[0]?.title || "Başlıksız öğe"}
          </span>
          <span className="text-[11px] text-gray-400 mt-0.5">
            {item.fields?.length || 0} alan
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onEdit}
          className="text-[11px] font-medium uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
        >
          Düzenle
        </button>
        <button
          onClick={onDelete}
          className="text-[11px] font-medium uppercase tracking-widest text-gray-300 hover:text-red-400 transition-colors"
        >
          Sil
        </button>
      </div>
    </div>
  );
}

export default function ProjectItems() {
  const router = useRouter();
  const { id } = useParams();

  const [items, setItems] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchItems = useCallback(async () => {
    const snapshot = await getDocs(collection(db, "projects", id as string, "items"));
    const data = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as ProjectItem[];

    data.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    setItems(data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDelete = async (itemId: string) => {
    if (!confirm("Bu öğeyi silmek istediğinize emin misiniz?")) return;
    await deleteDoc(doc(db, "projects", id as string, "items", itemId));
    await fetchItems();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);

    // Optimistic update
    setItems(reordered);

    // Persist new order to Firestore using batch write
    setSaving(true);
    try {
      const batch = writeBatch(db);
      reordered.forEach((item, index) => {
        const ref = doc(db, "projects", id as string, "items", item.id);
        batch.update(ref, { order: index });
      });
      await batch.commit();
    } catch (error) {
      console.error("Sıralama kaydedilemedi:", error);
      await fetchItems(); // Rollback on failure
    } finally {
      setSaving(false);
    }
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
          <div className="flex items-center gap-3">
            {saving && (
              <span className="text-[11px] text-gray-400 tracking-wide animate-pulse">
                Kaydediliyor...
              </span>
            )}
            <button
              onClick={() => router.push(`/admin/dashboard/projects/${id}/items/new`)}
              className="px-5 py-2 text-[11px] font-semibold uppercase tracking-widest bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              + Yeni Öğe
            </button>
          </div>
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <SortableItem
                    key={item.id}
                    item={item}
                    onEdit={() => router.push(`/admin/dashboard/projects/${id}/items/${item.id}`)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
