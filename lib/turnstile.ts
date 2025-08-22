import { env } from "./env";

type VerifyResp = {
  success: boolean;
  action?: string;
  cdata?: string;
  "error-codes"?: string[];
};

export async function verifyTurnstile(
  token: string,
  remoteip?: string,
  expectedAction?: string,
  expectedCdataPrefix?: string
) {
  if (!token) return { ok: false, reason: "missing_token" };

  const body = new URLSearchParams();
  body.set("secret", env.TURNSTILE_SECRET_KEY);
  body.set("response", token);
  if (remoteip) body.set("remoteip", remoteip);

  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  const data = (await res.json()) as VerifyResp;

  if (!data.success) return { ok: false, reason: data["error-codes"]?.join(",") ?? "verify_failed" };
  if (expectedAction && data.action !== expectedAction) return { ok: false, reason: "wrong_action" };
  if (expectedCdataPrefix && data.cdata && !data.cdata.startsWith(expectedCdataPrefix))
    return { ok: false, reason: "wrong_cdata" };

  return { ok: true as const };
}
