"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project, ProjectItem } from "@/types";

interface FlatField {
  title: string;
  description: string;
  images: string[];
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [flatFields, setFlatFields] = useState<FlatField[]>([]);
  const [selectedField, setSelectedField] = useState<FlatField | null>(null);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashFading, setSplashFading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [textVisible, setTextVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [infoCollapsed, setInfoCollapsed] = useState(false);

  useEffect(() => {
    const fetchProjects = async () => {
      const startTime = Date.now();
      const snapshot = await getDocs(collection(db, "projects"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Project[];
      setProjects(data);
      setLoading(false);

      // Auto-select first project and load its items
      if (data.length > 0) {
        const first = data[0];
        setSelectedProject(first);
        setItemsLoading(true);
        const itemsSnapshot = await getDocs(collection(db, "projects", first.id, "items"));
        const items = itemsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ProjectItem[];
        const flat: FlatField[] = [];
        for (const item of items) {
          for (const field of item.fields || []) {
            flat.push({
              title: field.title,
              description: field.description,
              images: field.images || [],
            });
          }
        }
        setFlatFields(flat);
        setItemsLoading(false);

        // Auto-select first item
        if (flat.length > 0) {
          setSelectedField(flat[0]);
          setSelectedImageIndex(0);
          if (flat[0].images.length > 0) {
            setImageLoading(true);
          }
          setTimeout(() => setTextVisible(true), 100);
        }
      }

      // Ensure splash shows for at least 2 seconds
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);
      setTimeout(() => {
        setSplashFading(true);
        setTimeout(() => setSplashVisible(false), 600);
      }, remaining);
    };
    fetchProjects();
  }, []);

  const handleSelectProject = async (project: Project) => {
    setSelectedProject(project);
    setSelectedField(null);
    setFlatFields([]);
    setItemsLoading(true);

    const snapshot = await getDocs(collection(db, "projects", project.id, "items"));
    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ProjectItem[];

    const flat: FlatField[] = [];
    for (const item of items) {
      for (const field of item.fields || []) {
        flat.push({
          title: field.title,
          description: field.description,
          images: field.images || [],
        });
      }
    }

    setFlatFields(flat);
    setItemsLoading(false);

    if (flat.length > 0) {
      setSelectedField(flat[0]);
      setSelectedImageIndex(0);
      setInfoCollapsed(false);
      if (flat[0].images.length > 0) {
        setImageLoading(true);
      }
      setTextVisible(false);
      setTimeout(() => setTextVisible(true), 100);
    }
  };

  const handleSelectField = (field: FlatField) => {
    setTextVisible(false);
    setSelectedField(field);
    setSelectedImageIndex(0);
    setInfoCollapsed(false);
    if (field.images.length > 0) {
      setImageLoading(true);
    }
    setTimeout(() => setTextVisible(true), 100);
  };

  const handleImageIndexChange = (index: number) => {
    setImageLoading(true);
    setSelectedImageIndex(index);
  };

  if (splashVisible) {
    return (
      <div
        className="h-screen flex flex-col items-center justify-center bg-white overflow-hidden"
        style={{
          opacity: splashFading ? 0 : 1,
          transition: "opacity 0.6s ease",
        }}
      >
        <img
          src="/LOGO.png"
          alt="CTS Logo"
          className="w-20 h-20 object-contain mb-8"
        />
        <div className="w-48 h-[3px] bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-black rounded-full"
            style={{
              animation: "splashProgress 2s ease-in-out forwards",
            }}
          />
        </div>
        <style>{`
          @keyframes splashProgress {
            0% { width: 0%; }
            60% { width: 70%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-6 px-8 h-14 overflow-x-auto">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => handleSelectProject(project)}
              className={`relative text-xs font-semibold uppercase tracking-widest whitespace-nowrap transition-colors duration-200 ${
                selectedProject?.id === project.id
                  ? "text-black"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {project.name}
              {selectedProject?.id === project.id && (
                <span className="absolute -bottom-[17px] left-0 right-0 h-[2px] bg-black" />
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">

        {!selectedProject && (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Lütfen bir proje seçin.</p>
          </div>
        )}

        {/* Sidebar */}
        {selectedProject && (
          <aside className="w-60 bg-white/80 backdrop-blur-sm border-r border-gray-200 shrink-0 flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {itemsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : flatFields.length === 0 ? (
                <p className="px-6 py-8 text-gray-300 text-xs tracking-wide">Öğe bulunamadı.</p>
              ) : (
                <ul className="py-2">
                  {flatFields.map((field, index) => (
                    <li key={index}>
                      <button
                        onClick={() => handleSelectField(field)}
                        className={`w-full text-left px-6 py-3 text-[13px] font-medium transition-all duration-200 ${
                          selectedField === field
                            ? "text-black bg-gray-50"
                            : "text-gray-400 hover:text-gray-700 hover:bg-gray-50/50"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-1 h-1 rounded-full shrink-0 transition-colors duration-200 ${
                            selectedField === field ? "bg-black" : "bg-gray-200"
                          }`} />
                          {field.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-gray-200 px-5 py-4 flex items-center gap-3">
              <img src="/LOGO.png" alt="CTS Logo" className="w-6 h-6 object-contain shrink-0" />
              <p className="text-[10px] text-gray-400 leading-tight">All rights reserved by CTS</p>
            </div>
          </aside>
        )}

        {/* Right content */}
        {selectedProject && (
          <main className="flex-1 overflow-hidden bg-gray-50 relative">
            {!selectedField ? (
              <div className="h-full flex items-center justify-center text-gray-400">
                <p>Lütfen bir öğe seçin.</p>
              </div>
            ) : (
              <div className="relative w-full h-full">

                {/* Full size image */}
                {selectedField.images.length > 0 ? (
                  <div className="relative w-full h-full">
                    {imageLoading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
                        <svg
                          className="animate-spin h-10 w-10 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                    <img
                      key={`${selectedField.title}-${selectedImageIndex}`}
                      src={selectedField.images[selectedImageIndex]}
                      alt="Görsel"
                      className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoading ? "opacity-0" : "opacity-100"}`}
                      onLoad={() => setImageLoading(false)}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                    Görsel yok
                  </div>
                )}

                {/* Thumbnail strip - bottom left */}
                {selectedField.images.length > 1 && (
                  <div className="absolute bottom-6 left-6 flex gap-2 max-w-xs overflow-hidden p-1">
                    {selectedField.images.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => handleImageIndexChange(index)}
                        className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden ring-2 ring-offset-1 transition-all ${
                          selectedImageIndex === index ? "ring-white opacity-100" : "ring-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img src={url} alt={`Görsel ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Animated text overlay - bottom right */}
                <div
                  className="absolute bottom-6 right-6 max-w-md font-[family-name:var(--font-montserrat)]"
                  style={{
                    opacity: textVisible ? 1 : 0,
                    transform: textVisible ? "translateY(0)" : "translateY(16px)",
                    transition: "opacity 0.5s ease, transform 0.5s ease",
                    maxHeight: "calc(100% - 48px)",
                  }}
                >
                  <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] border border-white/40 overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
                    <button
                      onClick={() => setInfoCollapsed((prev) => !prev)}
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/40 transition-colors duration-200 shrink-0"
                    >
                      <h2 className="text-base font-semibold tracking-wide text-gray-900">{selectedField.title}</h2>
                      <svg
                        className="w-4 h-4 text-gray-400 shrink-0 ml-3 transition-transform duration-300"
                        style={{ transform: infoCollapsed ? "rotate(0deg)" : "rotate(180deg)" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      className="transition-all duration-300 ease-in-out"
                      style={{
                        display: "grid",
                        gridTemplateRows: infoCollapsed ? "0fr" : "1fr",
                        opacity: infoCollapsed ? 0 : 1,
                      }}
                    >
                      <div className="overflow-hidden">
                        <div className="px-6 pb-5 border-t border-gray-200/40 overflow-y-auto" style={{ maxHeight: "calc(100vh - 200px)" }}>
                          <div
                            className="text-gray-900 text-sm leading-relaxed pt-3 prose prose-sm max-w-none [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4"
                            dangerouslySetInnerHTML={{ __html: selectedField.description }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </main>
        )}
      </div>
    </div>
  );
}