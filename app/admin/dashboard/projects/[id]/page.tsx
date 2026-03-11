"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";

interface FieldWithFiles {
  title: string;
  description: string;
  imageFiles: File[];
}

export default function NewItem() {
  const router = useRouter();
  const { id } = useParams();

  const [fields, setFields] = useState<FieldWithFiles[]>([
    { title: "", description: "", imageFiles: [] },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAddField = () => {
    if (fields.length >= 10) return;
    setFields([...fields, { title: "", description: "", imageFiles: [] }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: "title" | "description", value: string) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
  };

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const updated = [...fields];
    const combined = [...updated[index].imageFiles, ...selected].slice(0, 10);
    updated[index].imageFiles = combined;
    setFields(updated);
  };

  const handleRemoveImage = (fieldIndex: number, imageIndex: number) => {
    const updated = [...fields];
    updated[fieldIndex].imageFiles = updated[fieldIndex].imageFiles.filter((_, i) => i !== imageIndex);
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Upload images for each field
      const fieldsWithUrls = await Promise.all(
        fields.map(async (field) => {
          const imageUrls: string[] = [];
          for (const file of field.imageFiles) {
            const storageRef = ref(storage, `projects/${id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
          }
          return {
            title: field.title,
            description: field.description,
            images: imageUrls,
          };
        })
      );

      await addDoc(collection(db, "projects", id as string, "items"), {
        fields: fieldsWithUrls,
        createdAt: serverTimestamp(),
      });

      router.push(`/admin/dashboard/projects/${id}`);
    } catch (err) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto">

        <div className="mb-8">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-black mb-1">
            ← Geri
          </button>
          <h1 className="text-2xl font-bold">Yeni Öğe Ekle</h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">

          {fields.map((field, index) => (
            <div key={index} className="bg-white p-5 rounded-lg shadow-sm flex flex-col gap-3">

              {/* Field header */}
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

              {/* Title */}
              <input
                type="text"
                placeholder="Başlık"
                value={field.title}
                onChange={(e) => handleFieldChange(index, "title", e.target.value)}
                className="border p-3 rounded-lg w-full"
                required
              />

              {/* Description */}
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
                  <span className="text-xs text-gray-400">{field.imageFiles.length}/10</span>
                </div>

                {field.imageFiles.length < 10 && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageChange(index, e)}
                    className="border p-3 rounded-lg w-full text-sm"
                  />
                )}

                {field.imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.imageFiles.map((file, imgIndex) => (
                      <div key={imgIndex} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Görsel ${imgIndex + 1}`}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index, imgIndex)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ))}

          {/* Add field button */}
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
            disabled={loading}
            className="bg-black text-white p-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}