"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useRouter, useParams } from "next/navigation";
import RichTextEditor from "@/app/components/RichTextEditor";

type Mode = "default" | "video";

interface FieldWithFiles {
  title: string;
  description: string;
  imageFiles: File[];
}

interface VideoFieldWithFile {
  title: string;
  videoFile: File | null;
}

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export default function NewItem() {
  const router = useRouter();
  const { id } = useParams();

  const [mode, setMode] = useState<Mode>("default");

  // Default mode state
  const [fields, setFields] = useState<FieldWithFiles[]>([
    { title: "", description: "", imageFiles: [] },
  ]);

  // Video mode state
  const [videoFields, setVideoFields] = useState<VideoFieldWithFile[]>([
    { title: "", videoFile: null },
  ]);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // --- Default mode handlers ---
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
    const oversized = selected.filter((f) => f.size > MAX_IMAGE_SIZE);
    if (oversized.length > 0) {
      alert(`${oversized.length} görsel 10MB sınırını aşıyor ve eklenmedi.`);
    }
    const valid = selected.filter((f) => f.size <= MAX_IMAGE_SIZE);
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

  // --- Video mode handlers ---
  const handleAddVideoField = () => {
    if (videoFields.length >= 10) return;
    setVideoFields([...videoFields, { title: "", videoFile: null }]);
  };

  const handleRemoveVideoField = (index: number) => {
    setVideoFields(videoFields.filter((_, i) => i !== index));
  };

  const handleVideoFieldTitleChange = (index: number, value: string) => {
    const updated = [...videoFields];
    updated[index].title = value;
    setVideoFields(updated);
  };

  const handleVideoChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > MAX_VIDEO_SIZE) {
      alert("Video dosyası 50MB sınırını aşıyor.");
      e.target.value = "";
      return;
    }
    const updated = [...videoFields];
    updated[index].videoFile = file;
    setVideoFields(updated);
    e.target.value = "";
  };

  const handleRemoveVideo = (index: number) => {
    const updated = [...videoFields];
    updated[index].videoFile = null;
    setVideoFields(updated);
  };

  // --- Submit ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || submitted) return;
    setLoading(true);
    setError("");

    try {
      if (mode === "default") {
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
      } else {
        const fieldsWithUrls = await Promise.all(
          videoFields.map(async (field) => {
            let videoUrl = "";
            if (field.videoFile) {
              const storageRef = ref(storage, `projects/${id}/videos/${Date.now()}_${field.videoFile.name}`);
              await uploadBytes(storageRef, field.videoFile);
              videoUrl = await getDownloadURL(storageRef);
            }
            return {
              title: field.title,
              description: "",
              images: [],
              videoUrl,
            };
          })
        );

        await addDoc(collection(db, "projects", id as string, "items"), {
          fields: fieldsWithUrls,
          createdAt: serverTimestamp(),
        });
      }

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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-lg font-semibold tracking-tight text-gray-900">Yeni Öğe Ekle</h1>
          <button
            type="button"
            onClick={() => setMode(mode === "default" ? "video" : "default")}
            className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-xl border transition-colors ${
              mode === "video"
                ? "bg-black text-white border-black hover:bg-gray-800"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            }`}
          >
            {mode === "video" ? "Görsel Modu" : "Video Yükle"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {mode === "default" ? (
            <>
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

              {fields.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddField}
                  className="w-full py-3 text-xs text-gray-400 uppercase tracking-widest border border-dashed border-gray-200 rounded-xl hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  + Alan Ekle
                </button>
              )}
            </>
          ) : (
            <>
              {videoFields.map((field, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Video {index + 1}</span>
                    {videoFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVideoField(index)}
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
                    onChange={(e) => handleVideoFieldTitleChange(index, e.target.value)}
                    className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
                    required
                  />

                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-medium text-gray-400 uppercase tracking-widest">Video</span>
                      <span className="text-[11px] text-gray-300">Maks. 50MB</span>
                    </div>

                    {!field.videoFile ? (
                      <label className="flex items-center justify-center w-full py-3 border border-dashed border-gray-200 rounded-xl text-xs text-gray-400 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                        <span>Video seç...</span>
                        <input
                          type="file"
                          accept="video/*"
                          onChange={(e) => handleVideoChange(index, e)}
                          className="hidden"
                        />
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                        <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                        </svg>
                        <span className="text-sm text-gray-600 truncate flex-1">{field.videoFile.name}</span>
                        <span className="text-[11px] text-gray-400 shrink-0">{(field.videoFile.size / (1024 * 1024)).toFixed(1)}MB</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVideo(index)}
                          className="text-gray-300 hover:text-red-400 transition-colors shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {videoFields.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddVideoField}
                  className="w-full py-3 text-xs text-gray-400 uppercase tracking-widest border border-dashed border-gray-200 rounded-xl hover:border-gray-400 hover:text-gray-600 transition-colors"
                >
                  + Video Alanı Ekle
                </button>
              )}
            </>
          )}

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
