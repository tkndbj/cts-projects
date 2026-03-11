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
    await addDoc(collection(db, "projects"), {
      name: newProjectName.trim(),
      createdAt: serverTimestamp(),
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
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">Projeler</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-black"
          >
            Çıkış Yap
          </button>
        </div>

        {/* Add new project */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            placeholder="Yeni proje adı"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            className="border p-3 rounded-lg flex-1"
          />
          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-black text-white px-6 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {adding ? "Ekleniyor..." : "Ekle"}
          </button>
        </div>

        {/* Project list */}
        {loading ? (
          <p className="text-gray-500">Yükleniyor...</p>
        ) : projects.length === 0 ? (
          <p className="text-gray-500">Henüz proje eklenmedi.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center"
              >
                <span className="font-medium">{project.name}</span>
                <div className="flex gap-3">
                  <button
                    onClick={() => router.push(`/admin/dashboard/projects/${project.id}`)}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    Yönet
                  </button>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-sm text-red-500 hover:underline"
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