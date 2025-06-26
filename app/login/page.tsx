"use client";
import { useState } from "react";
import { supabase } from '@/lib/supabase';
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("Login failed");
      return;
    }

    const user = data.user;

    // Fetch role from 'profiles' table
    const { data: profileData, error: profileError } = await supabase
      .from("profiles") // If you don't have this yet, I’ll give it next
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      alert("Role fetch failed");
      return;
    }

    // ✅ Save locally
    localStorage.setItem("user_id", user.id);
    localStorage.setItem("user_role", profileData.role);

    // Redirect to dashboard
    router.push("/dashboard");
  };

  return (
    <div className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white">Login</h1>
      <input
        type="email"
        placeholder="Email"
        className="w-full p-2 rounded bg-[#1A1F2E] text-white"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full p-2 rounded bg-[#1A1F2E] text-white"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button
        onClick={handleLogin}
        className="w-full py-2 bg-yellow-400 text-black font-semibold rounded"
      >
        Log In
      </button>
    </div>
  );
}
