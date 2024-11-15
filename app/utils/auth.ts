import { SignJWT, jwtVerify } from 'jose';

export const verifyToken = async (token: string) => {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
};

interface TokenPayload {
  userId: string;
  email: string;
  [key: string]: string;
}

export const createToken = async (payload: TokenPayload) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined');
  }

  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('24h')
    .sign(secret);
    
  return token;
}; 