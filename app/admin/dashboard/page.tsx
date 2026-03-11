"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { Project } from "@/types";

export default function AdminDashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchProjects = async () => {
    const snapshot = await getDocs(collection(db, "projects"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
    setProjects(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleAdd = async () => {
    if (!newProjectName.trim()) return;
    setAdding(true);
    const user = auth.currentUser;
    await addDoc(collection(db, "projects"), {
      name: newProjectName.trim(),
      createdAt: serverTimestamp(),
      createdBy: user?.email || "",
    });
    setNewProjectName("");
    await fetchProjects();
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu projeyi silmek istediğinize emin misiniz?")) return;
    await deleteDoc(doc(db, "projects", id));
    await fetchProjects();
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin");
  };

  return (
    <div className="min-h-screen bg-gray-50 font-[family-name:var(--font-montserrat)]">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <h1 className="text-xs font-semibold uppercase tracking-widest text-gray-900">Projeler</h1>
          <button
            onClick={handleLogout}
            className="text-[11px] text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Add new project */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="Yeni proje adı"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="px-6 py-3 text-xs font-semibold uppercase tracking-widest bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {adding ? "..." : "Ekle"}
          </button>
        </div>

        {/* Project list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : projects.length === 0 ? (
          <p className="text-center text-gray-300 text-sm py-16">Henüz proje eklenmedi.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-900">{project.name}</span>
                  {project.createdBy && (
                    <span className="text-[11px] text-gray-400 mt-0.5">{project.createdBy}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => router.push(`/admin/dashboard/projects/${project.id}`)}
                    className="text-[11px] font-medium uppercase tracking-widest text-gray-400 hover:text-black transition-colors"
                  >
                    Yönet
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
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
