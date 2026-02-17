import { verifyMessage } from 'viem';
import { getCookie, setCookie, deleteCookie } from 'h3';

const DEFAULT_ALLOWED = '0x2127aa7265d573aa467f1d73554d17890b872e76'.toLowerCase();

export function isAddressAllowed(address: string, allowedAddress?: string): boolean {
  const allowed = (allowedAddress || DEFAULT_ALLOWED).toLowerCase();
  return address.toLowerCase() === allowed;
}

export async function verifySignature(
  address: string,
  message: string,
  signature: string,
  allowedAddress?: string
): Promise<boolean> {
  try {
    const isValid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return isValid && isAddressAllowed(address, allowedAddress);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export function createSession(event: any, address: string): void {
  setCookie(event, 'auth_session', address, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function getSession(event: any, allowedAddress?: string): string | null {
  const session = getCookie(event, 'auth_session');
  if (session && isAddressAllowed(session, allowedAddress)) {
    return session;
  }
  return null;
}

export function clearSession(event: any): void {
  deleteCookie(event, 'auth_session');
}

export function checkAuth(event: any, allowedAddress?: string): boolean {
  let allowed = allowedAddress;
  if (!allowed) {
    try {
      const config = useRuntimeConfig();
      allowed = config.allowedAddress;
    } catch {
      allowed = DEFAULT_ALLOWED;
    }
  }
  const session = getCookie(event, 'auth_session');
  if (!session) return false;
  return isAddressAllowed(session, allowed);
}

