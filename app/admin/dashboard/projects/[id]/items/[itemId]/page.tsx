"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { ProjectItem, ItemField } from "@/types";

interface FieldWithFiles {
  title: string;
  description: string;
  existingImages: string[];
  newImageFiles: File[];
}

export default function EditItem() {
  const router = useRouter();
  const { id, itemId } = useParams();

  const [fields, setFields] = useState<FieldWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchItem = async () => {
      const docRef = doc(db, "projects", id as string, "items", itemId as string);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as ProjectItem;
        const loaded: FieldWithFiles[] = (data.fields || []).map((f: ItemField) => ({
          title: f.title,
          description: f.description,
          existingImages: f.images || [],
          newImageFiles: [],
        }));
        setFields(loaded);
      }
      setLoading(false);
    };
    fetchItem();
  }, []);

  const handleAddField = () => {
    if (fields.length >= 10) return;
    setFields([...fields, { title: "", description: "", existingImages: [], newImageFiles: [] }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: "title" | "description", value: string) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
  };

  const handleImageChange = (fieldIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const updated = [...fields];
    const total = updated[fieldIndex].existingImages.length + updated[fieldIndex].newImageFiles.length;
    const combined = [...updated[fieldIndex].newImageFiles, ...selected].slice(0, 10 - updated[fieldIndex].existingImages.length);
    updated[fieldIndex].newImageFiles = combined;
    setFields(updated);
  };

  const handleRemoveExistingImage = async (fieldIndex: number, url: string) => {
    if (!confirm("Bu görseli silmek istediğinize emin misiniz?")) return;
    try {
      await deleteObject(ref(storage, url));
    } catch (err) {}
    const updated = [...fields];
    updated[fieldIndex].existingImages = updated[fieldIndex].existingImages.filter((img) => img !== url);
    setFields(updated);
  };

  const handleRemoveNewImage = (fieldIndex: number, imageIndex: number) => {
    const updated = [...fields];
    updated[fieldIndex].newImageFiles = updated[fieldIndex].newImageFiles.filter((_, i) => i !== imageIndex);
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const fieldsWithUrls = await Promise.all(
        fields.map(async (field) => {
          const newUrls: string[] = [];
          for (const file of field.newImageFiles) {
            const storageRef = ref(storage, `projects/${id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            newUrls.push(url);
          }
          return {
            title: field.title,
            description: field.description,
            images: [...field.existingImages, ...newUrls],
          };
        })
      );

      await updateDoc(doc(db, "projects", id as string, "items", itemId as string), {
        fields: fieldsWithUrls,
        updatedAt: serverTimestamp(),
      });

      router.push(`/admin/dashboard/projects/${id}`);
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-black mb-1">
            ← Geri
          </button>
          <h1 className="text-2xl font-bold">Öğeyi Düzenle</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {fields.map((field, index) => (
            <div key={index} className="bg-white p-5 rounded-lg shadow-sm flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Alan {index + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Kaldır
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Başlık"
                value={field.title}
                onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                className="border p-3 rounded-lg w-full"
                required
              />

              <textarea
                placeholder="Açıklama"
                value={field.description}
                onChange={(e) => handleFieldChange(index, "description", e.target.value)}
                className="border p-3 rounded-lg w-full h-28 resize-none"
                required
              />

              {/* Images */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Görseller</span>
                  <span className="text-xs text-gray-400">
                    {field.existingImages.length + field.newImageFiles.length}/10
                  </span>
                </div>

                {/* Existing images */}
                {field.existingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.existingImages.map((url) => (
                      <div key={url} className="relative">
                        <img src={url} alt="Görsel" className="w-24 h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(index, url)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New image previews */}
                {field.newImageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.newImageFiles.map((file, imgIndex) => (
                      <div key={imgIndex} className="relative">
                        <img src={URL.createObjectURL(file)} alt={`Yeni ${imgIndex + 1}`} className="w-24 h-24 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => handleRemoveNewImage(index, imgIndex)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {field.existingImages.length + field.newImageFiles.length < 10 && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageChange(index, e)}
                    className="border p-3 rounded-lg w-full text-sm"
                  />
                )}
              </div>
            </div>
          ))}

          {fields.length < 10 && (
            <button
              type="button"
              onClick={handleAddField}
              className="border-2 border-dashed border-gray-300 text-gray-500 hover:border-black hover:text-black rounded-lg p-3 text-sm transition-colors"
            >
              + Yeni Alan Ekle
            </button>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white p-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}