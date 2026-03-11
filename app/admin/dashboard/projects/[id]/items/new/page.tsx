"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/app/components/RichTextEditor";

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
  const [submitted, setSubmitted] = useState(false);
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

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleImageChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const oversized = selected.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      alert(`${oversized.length} görsel 10MB sınırını aşıyor ve eklenmedi.`);
    }
    const valid = selected.filter((f) => f.size <= MAX_FILE_SIZE);
    const updated = [...fields];
    const combined = [...updated[index].imageFiles, ...valid].slice(0, 10);
    updated[index].imageFiles = combined;
    setFields(updated);
    e.target.value = "";
  };

  const handleRemoveImage = (fieldIndex: number, imageIndex: number) => {
    const updated = [...fields];
    updated[fieldIndex].imageFiles = updated[fieldIndex].imageFiles.filter((_, i) => i !== imageIndex);
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || submitted) return;
    setLoading(true);
    setError("");

    try {
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

      setSubmitted(true);
      router.replace(`/admin/dashboard/projects/${id}`);
    } catch (err) {
      console.error(err);
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-montserrat)]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center">
          <button
            onClick={() => router.back()}
            className="text-[11px] text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
          >
            &larr; Geri
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 mb-8">Yeni Öğe Ekle</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {fields.map((field, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Alan {index + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveField(index)}
                    className="text-[11px] text-gray-300 hover:text-red-400 uppercase tracking-widest transition-colors"
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
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                required
              />

              <RichTextEditor
                value={field.description}
                onChange={(val) => handleFieldChange(index, "description", val)}
                placeholder="Açıklama"
              />

              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Görseller</span>
                  <span className="text-[11px] text-gray-300">{field.imageFiles.length}/10</span>
                </div>

                {field.imageFiles.length < 10 && (
                  <label className="flex items-center justify-center w-full py-3 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                    <span>Görsel seç...</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => handleImageChange(index, e)}
                      className="hidden"
                    />
                  </label>
                )}

                {field.imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {field.imageFiles.map((file, imgIndex) => (
                      <div key={imgIndex} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Görsel ${imgIndex + 1}`}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index, imgIndex)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading || submitted}
            className="w-full py-3 text-xs font-semibold uppercase tracking-widest bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {submitted ? "Kaydedildi" : loading ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
}
