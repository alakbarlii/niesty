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

async function verifyTurnstile(
  token: string | undefined,
  ip: string | null,
  expectedAction: string,
  expectedCdataPrefix: string
): Promise<void> {
  const featureOn = process.env.NEXT_PUBLIC_FEATURE_TURNSTILE === "1";
  if (!featureOn) {
    if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === "1") {
      console.log("[WL] DEBUG: captcha disabled via flag");
    }
    return;
  }

  if (!token) throw new Error("Captcha token missing");

  // Support either var name; prefer CAPTCHA_SECRET_KEY if set
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
  const data = (await resp.json()) as TurnstileVerifyResponse;

  if (process.env.NEXT_PUBLIC_DEBUG_CAPTCHA === "1") {
    console.log("[WL] verifyTurnstile:", JSON.stringify(data));
  }

  if (!data.success) {
    throw new Error(`Captcha failed: ${data["error-codes"]?.join(",") || "unknown"}`);
  }
  if (data.action !== expectedAction) {
    throw new Error("Captcha wrong action");
  }
  if (data.cdata && !data.cdata.startsWith(expectedCdataPrefix)) {
    throw new Error("Captcha wrong cdata");
  }
}

export async function POST(req: NextRequest) {
  try {
    // Origin allowlist (403 on mismatch)
    assertAllowedOrigin(req as unknown as Request);

    const ip = req.headers.get("x-forwarded-for");
    const { email, full_name, role, token } = (await req.json()) as Body;

    const normalized = (email || "").trim().toLowerCase();
    if (!normalized || !full_name?.trim() || !role) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    // Enforce Turnstile semantics
    await verifyTurnstile(token, ip, "waitlist_submit", "wl:");

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error } = await admin
      .from("waitlist")
      .upsert({ email: normalized, full_name, role }, { onConflict: "email" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof HttpError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: e.status });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}
