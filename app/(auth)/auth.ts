import { headers } from 'next/headers';

export type UserType = 'regular';

export interface Session {
  user: {
    id: string;
    email: string;
    type: UserType;
  };
}

export interface User {
  id: string;
  email: string;
  type: UserType;
}

export async function auth(): Promise<Session> {
  const h = headers();
  const email = h.get('X-Ms-Client-Principal-Name') ?? 'dev';
  return { user: { id: email, email, type: 'regular' } };
}

export async function signIn() {
  throw new Error('signIn is not implemented');
}

export async function signOut() {
  throw new Error('signOut is not implemented');
}

export const handlers = {
  GET: async () => new Response('Not Implemented', { status: 404 }),
  POST: async () => new Response('Not Implemented', { status: 404 }),
};
