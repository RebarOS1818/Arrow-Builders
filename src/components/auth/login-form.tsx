"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "sign_in" | "sign_up";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState<Mode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);

    try {
      const supabase = createClient();

      if (mode === "sign_in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(searchParams.get("next") ?? "/");
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/");
          router.refresh();
        } else {
          setNotice("Check your inbox to confirm your email, then sign in.");
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-5 space-y-3">
      {mode === "sign_up" && (
        <Field
          label="Full name"
          type="text"
          value={fullName}
          onChange={setFullName}
          autoComplete="name"
          required
        />
      )}

      <Field
        label="Work email"
        type="email"
        value={email}
        onChange={setEmail}
        autoComplete="email"
        required
      />
      <Field
        label="Password"
        type="password"
        value={password}
        onChange={setPassword}
        autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
        required
      />

      {error && <p className="rounded-lg bg-rose-50 p-2.5 text-sm text-rose-700">{error}</p>}
      {notice && <p className="rounded-lg bg-brand-50 p-2.5 text-sm text-brand-800">{notice}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-700 px-4 py-2.5 font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Please wait…" : mode === "sign_in" ? "Sign in" : "Create account"}
      </button>

      <button
        type="button"
        onClick={() => {
          setMode(mode === "sign_in" ? "sign_up" : "sign_in");
          setError(null);
          setNotice(null);
        }}
        className="w-full text-center text-sm text-ink-muted hover:text-ink"
      >
        {mode === "sign_in" ? "Need an account? Sign up" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
