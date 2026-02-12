import { jwtVerify } from "jose"

type JwtPayload = {
  sub?: string
}

function getJwtSecret(): Uint8Array | null {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null
  return new TextEncoder().encode(secret)
}

export function extractAccessToken(raw?: string | null): string | null {
  if (!raw) return null
  // If the cookie already stores a raw JWT, pass it through.
  if (raw.split(".").length === 3) return raw
  try {
    const parsed = JSON.parse(raw)
    return (
      parsed?.currentToken ||
      parsed?.access_token ||
      parsed?.value?.access_token ||
      parsed?.currentSession?.access_token ||
      null
    )
  } catch {
    return null
  }
}

export async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  const secret = getJwtSecret()
  if (!secret) return null
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] })
    return payload as JwtPayload
  } catch {
    return null
  }
}
