import { env } from "./env";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function assertAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const referer = req.headers.get("referer") ?? "";
  const allow = (env.ALLOWED_ORIGINS ?? []) as string[];

  const ok =
    allow.some((o) => origin.startsWith(o)) ||
    allow.some((o) => referer.startsWith(o));

  if (!ok) {
    throw new HttpError(403, "Origin not allowed");
  }
}
