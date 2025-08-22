export function getClientIp(req: Request) {
    const xf = req.headers.get("x-forwarded-for");
    if (xf) return xf.split(",")[0].trim();
    const cf = req.headers.get("cf-connecting-ip");
    if (cf) return cf.trim();
    return req.headers.get("x-real-ip") ?? undefined;
  }
  