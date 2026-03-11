"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch (err) {
      setError("Geçersiz e-posta veya şifre.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Yönetici Girişi</h1>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="E-posta"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-3 rounded-lg w-full"
            required
          />
          <input
            type="password"
            placeholder="Şifre"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border p-3 rounded-lg w-full"
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="bg-black text-white p-3 rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}