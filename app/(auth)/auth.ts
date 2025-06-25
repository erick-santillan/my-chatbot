import { headers } from 'next/headers';

export type UserType = 'regular';

export async function auth() {
  const headerList = headers();
  const userId = headerList.get('X-Ms-Client-Principal-Name') || 'dev';

  return {
    user: {
      id: userId,
      email: userId,
      type: 'regular' as UserType,
    },
  };
}

export async function signIn() {
  // authentication is handled externally
  return { status: 'ok' };
}

export async function signOut() {
  // authentication is handled externally
  return { status: 'ok' };
}

export async function GET() {
  return new Response('Not Implemented', { status: 404 });
}

export async function POST() {
  return new Response('Not Implemented', { status: 404 });
}
