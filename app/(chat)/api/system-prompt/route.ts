import { auth } from '@/app/(auth)/auth';
import { getSystemPromptByUserId, upsertSystemPrompt } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  const prompt = await getSystemPromptByUserId({ userId: session.user.id });

  return Response.json({ prompt: prompt?.prompt ?? '' });
}

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user) {
    return new ChatSDKError('unauthorized:api').toResponse();
  }

  let body: { prompt?: string };
  try {
    body = await request.json();
  } catch {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  if (typeof body.prompt !== 'string') {
    return new ChatSDKError('bad_request:api').toResponse();
  }

  await upsertSystemPrompt({ userId: session.user.id, prompt: body.prompt });

  return Response.json({ success: true });
}
