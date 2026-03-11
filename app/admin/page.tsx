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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-[family-name:var(--font-montserrat)]">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-xl font-semibold tracking-tight text-gray-900">Yönetici Girişi</h1>
          <p className="text-xs text-gray-400 mt-1 tracking-wide">Devam etmek için giriş yapın</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">E-posta</label>
            <input
              type="email"
              placeholder="ornek@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
              required
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">Şifre</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-gray-400 transition-colors placeholder:text-gray-300"
              required
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-3 text-xs font-semibold uppercase tracking-widest bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 transition-colors"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
}
