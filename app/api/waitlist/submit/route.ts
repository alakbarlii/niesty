import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { assertAllowedOrigin, HttpError } from "@/lib/origin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  email?: string;
  full_name?: string;
  role?: "creator" | "business";
  token?: string; // Turnstile token
};

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

// ---- HARD-ENFORCED Turnstile verification (no feature flag bypass) ----
async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
  expectedAction: string,
  expectedCdataPrefix: string
): Promise<void> {
  if (!token) throw new Error("Captcha token missing");

  const secret = process.env.CAPTCHA_SECRET_KEY || process.env.TURNSTILE_SECRET_KEY;
  if (!secret) throw new Error("Server misconfigured: CAPTCHA_SECRET_KEY missing");

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip) body.set("remoteip", ip.split(",")[0].trim());

  const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!resp.ok) throw new Error(`Captcha verify request failed with ${resp.status}`);

  const data = (await resp.json()) as TurnstileVerifyResponse;
  if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === "1") {
    console.log("[WL] verifyTurnstile:", JSON.stringify(data));
  }

  if (!data.success) {
    throw new Error(`Captcha failed: ${data["error-codes"]?.join(",") || "unknown"}`);
  }
  if (data.action !== expectedAction) {
    throw new Error(`Captcha wrong action: expected=${expectedAction}, got=${data.action}`);
  }
  if (data.cdata && !data.cdata.startsWith(expectedCdataPrefix)) {
    throw new Error(`Captcha wrong cdata: expected prefix=${expectedCdataPrefix}`);
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1) Origin allowlist (403 on mismatch)
    assertAllowedOrigin(req as unknown as Request);

    // 2) Parse body + basic field validation
    const ip = req.headers.get("x-forwarded-for");
    const { email, full_name, role, token } = (await req.json()) as Body;

    const normalized = (email || "").trim().toLowerCase();
    if (!normalized || !full_name?.trim() || !role) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // 3) HARD BLOCK: no token -> reject immediately (fixes your 200 case)
    if (!token) {
      return NextResponse.json({ ok: false, error: "Captcha token missing" }, { status: 400 });
    }

    // 4) Verify Turnstile (strict action + cdata semantics)
    await verifyTurnstile(token, ip, "waitlist_submit", "wl_"); // <-- underscore to match client

    // 5) Upsert waitlist (service role only)
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin
      .from("waitlist")
      .upsert({ email: normalized, full_name: full_name.trim(), role }, { onConflict: "email" });

    if (error) {
      console.error("[WL] DB error:", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    // Optional debug header to confirm enforced path (remove later if you want)
    const res = NextResponse.json({ ok: true }, { status: 200 });
    if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === "1") res.headers.set("x-turnstile", "enforced");
    return res;
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("[WL] Request failed:", msg);
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
