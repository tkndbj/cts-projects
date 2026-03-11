"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import { ProjectItem, ItemField } from "@/types";
import RichTextEditor from "@/app/components/RichTextEditor";

interface FieldWithFiles {
  title: string;
  description: string;
  existingImages: string[];
  newImageFiles: File[];
  videoUrl?: string;
  newVideoFile?: File | null;
}

export default function EditItem() {
  const router = useRouter();
  const { id, itemId } = useParams();

  const [fields, setFields] = useState<FieldWithFiles[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isVideoItem = fields.length > 0 && fields.some((f) => f.videoUrl || f.newVideoFile);

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
          videoUrl: f.videoUrl || "",
          newVideoFile: null,
        }));
        setFields(loaded);
      }
      setLoading(false);
    };
    fetchItem();
  }, []);

  const handleAddField = () => {
    if (fields.length >= 10) return;
    setFields([...fields, { title: "", description: "", existingImages: [], newImageFiles: [], videoUrl: "", newVideoFile: null }]);
  };

  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleFieldChange = (index: number, key: "title" | "description", value: string) => {
    const updated = [...fields];
    updated[index][key] = value;
    setFields(updated);
  };

  const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  const handleImageChange = (fieldIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    const oversized = selected.filter((f) => f.size > MAX_IMAGE_SIZE);
    if (oversized.length > 0) {
      alert(`${oversized.length} görsel 10MB sınırını aşıyor ve eklenmedi.`);
    }
    const valid = selected.filter((f) => f.size <= MAX_IMAGE_SIZE);
    const updated = [...fields];
    const combined = [...updated[fieldIndex].newImageFiles, ...valid].slice(0, 10 - updated[fieldIndex].existingImages.length);
    updated[fieldIndex].newImageFiles = combined;
    setFields(updated);
    e.target.value = "";
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

  const handleVideoChange = (fieldIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > MAX_VIDEO_SIZE) {
      alert("Video dosyası 50MB sınırını aşıyor.");
      e.target.value = "";
      return;
    }
    const updated = [...fields];
    updated[fieldIndex].newVideoFile = file;
    setFields(updated);
    e.target.value = "";
  };

  const handleRemoveExistingVideo = async (fieldIndex: number) => {
    const url = fields[fieldIndex].videoUrl;
    if (!url) return;
    if (!confirm("Bu videoyu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteObject(ref(storage, url));
    } catch (err) {}
    const updated = [...fields];
    updated[fieldIndex].videoUrl = "";
    setFields(updated);
  };

  const handleRemoveNewVideo = (fieldIndex: number) => {
    const updated = [...fields];
    updated[fieldIndex].newVideoFile = null;
    setFields(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const fieldsWithUrls = await Promise.all(
        fields.map(async (field) => {
          // Handle images
          const newUrls: string[] = [];
          for (const file of field.newImageFiles) {
            const storageRef = ref(storage, `projects/${id}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, file);
            const url = await getDownloadURL(storageRef);
            newUrls.push(url);
          }

          // Handle video
          let videoUrl = field.videoUrl || "";
          if (field.newVideoFile) {
            const storageRef = ref(storage, `projects/${id}/videos/${Date.now()}_${field.newVideoFile.name}`);
            await uploadBytes(storageRef, field.newVideoFile);
            videoUrl = await getDownloadURL(storageRef);
          }

          const result: Record<string, unknown> = {
            title: field.title,
            description: field.description,
            images: [...field.existingImages, ...newUrls],
          };

          if (videoUrl) {
            result.videoUrl = videoUrl;
          }

          return result;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-[family-name:var(--font-montserrat)]">
        <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

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
        <h1 className="text-lg font-semibold tracking-tight text-gray-900 mb-8">Öğeyi Düzenle</h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {fields.map((field, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">
                  {isVideoItem ? `Video ${index + 1}` : `Alan ${index + 1}`}
                </span>
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

              {/* Video fields: show video upload instead of description + images */}
              {isVideoItem ? (
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Video</span>
                    <span className="text-[11px] text-gray-300">Maks. 50MB</span>
                  </div>

                  {/* Existing video */}
                  {field.videoUrl && !field.newVideoFile && (
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span className="text-sm text-gray-600 truncate flex-1">Mevcut video</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingVideo(index)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* New video file */}
                  {field.newVideoFile && (
                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                      <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span className="text-sm text-gray-600 truncate flex-1">{field.newVideoFile.name}</span>
                      <span className="text-[11px] text-gray-400 shrink-0">{(field.newVideoFile.size / (1024 * 1024)).toFixed(1)}MB</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveNewVideo(index)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}

                  {/* Upload button when no video */}
                  {!field.videoUrl && !field.newVideoFile && (
                    <label className="flex items-center justify-center w-full py-3 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                      <span>Video seç...</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoChange(index, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              ) : (
                <>
                  <RichTextEditor
                    value={field.description}
                    onChange={(val) => handleFieldChange(index, "description", val)}
                    placeholder="Açıklama"
                  />

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Görseller</span>
                      <span className="text-[11px] text-gray-300">
                        {field.existingImages.length + field.newImageFiles.length}/10
                      </span>
                    </div>

                    {/* Existing images */}
                    {field.existingImages.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.existingImages.map((url) => (
                          <div key={url} className="relative group">
                            <img src={url} alt="Görsel" className="w-20 h-20 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingImage(index, url)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* New image previews */}
                    {field.newImageFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {field.newImageFiles.map((file, imgIndex) => (
                          <div key={imgIndex} className="relative group">
                            <img src={URL.createObjectURL(file)} alt={`Yeni ${imgIndex + 1}`} className="w-20 h-20 object-cover rounded-lg" />
                            <button
                              type="button"
                              onClick={() => handleRemoveNewImage(index, imgIndex)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-black text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {field.existingImages.length + field.newImageFiles.length < 10 && (
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
                  </div>
                </>
              )}
            </div>
          ))}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 text-xs font-semibold uppercase tracking-widest bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {saving ? "Kaydediliyor..." : "Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}
