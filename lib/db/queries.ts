import 'server-only';
import { ObjectId } from 'mongodb';
import { getDb } from './mongo';
import type {
  User,
  Chat,
  DBMessage,
  Document,
  Suggestion,
  Vote,
  Stream,
} from './mongo-types';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';
import type { VisibilityType } from '@/components/visibility-selector';
import { ChatSDKError } from '../errors';

export async function getUser(email: string): Promise<Array<User>> {
  try {
    const db = await getDb();
    return await db.collection<User>('users').find({ email }).toArray();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get user by email');
  }
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);
  try {
    const db = await getDb();
    await db.collection<User>('users').insertOne({
      id: generateUUID(),
      email,
      password: hashedPassword,
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create user');
  }
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());
  try {
    const db = await getDb();
    const result = await db.collection<User>('users').insertOne({
      id: generateUUID(),
      email,
      password,
    });
    return [{ id: result.insertedId.toString(), email }];
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create guest user');
  }
}

export async function saveChat({ id, userId, title, visibility }: {
  id: string;
  userId: string;
  title: string;
  visibility: VisibilityType;
}) {
  try {
    const db = await getDb();
    await db.collection<Chat>('chats').insertOne({
      id,
      userId,
      title,
      visibility,
      createdAt: new Date(),
    });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save chat');
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const db = await getDb();
    return await db.collection<Chat>('chats').findOne({ id });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chat by id');
  }
}

export async function saveMessages({ messages }: { messages: Array<DBMessage> }) {
  try {
    const db = await getDb();
    if (messages.length) {
      await db.collection<DBMessage>('messages').insertMany(messages);
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save messages');
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    const db = await getDb();
    return await db
      .collection<DBMessage>('messages')
      .find({ chatId: id })
      .sort({ createdAt: 1 })
      .toArray();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get messages by chat id');
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    const db = await getDb();
    await db.collection<Vote>('votes').deleteMany({ chatId: id });
    await db.collection<DBMessage>('messages').deleteMany({ chatId: id });
    await db.collection('streams').deleteMany({ chatId: id });
    const result = await db.collection<Chat>('chats').findOneAndDelete({ id });
    return result.value;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to delete chat by id');
  }
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  try {
    const db = await getDb();
    const extendedLimit = limit + 1;

    let filter: any = { userId: id };
    if (startingAfter) {
      const chat = await db.collection<Chat>('chats').findOne({ id: startingAfter });
      if (!chat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${startingAfter} not found`);
      }
      filter.createdAt = { $gt: chat.createdAt };
    } else if (endingBefore) {
      const chat = await db.collection<Chat>('chats').findOne({ id: endingBefore });
      if (!chat) {
        throw new ChatSDKError('not_found:database', `Chat with id ${endingBefore} not found`);
      }
      filter.createdAt = { $lt: chat.createdAt };
    }

    const chats = await db
      .collection<Chat>('chats')
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(extendedLimit)
      .toArray();

    const hasMore = chats.length > limit;
    return { chats: hasMore ? chats.slice(0, limit) : chats, hasMore };
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get chats by user id');
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  try {
    const db = await getDb();
    const existing = await db.collection<Vote>('votes').findOne({ chatId, messageId });
    if (existing) {
      await db
        .collection<Vote>('votes')
        .updateOne({ chatId, messageId }, { $set: { isUpvoted: type === 'up' } });
    } else {
      await db
        .collection<Vote>('votes')
        .insertOne({ chatId, messageId, isUpvoted: type === 'up' });
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to vote message');
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    const db = await getDb();
    return await db.collection<Vote>('votes').find({ chatId: id }).toArray();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get votes by chat id');
  }
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: 'text' | 'code' | 'image' | 'sheet';
  content: string;
  userId: string;
}) {
  try {
    const db = await getDb();
    const document: Document = {
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    };
    await db.collection<Document>('documents').insertOne(document);
    return document;
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save document');
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const db = await getDb();
    return await db
      .collection<Document>('documents')
      .find({ id })
      .sort({ createdAt: 1 })
      .toArray();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get documents by id');
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const db = await getDb();
    return await db
      .collection<Document>('documents')
      .find({ id })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get document by id');
  }
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  try {
    const db = await getDb();
    await db
      .collection<Suggestion>('suggestions')
      .deleteMany({ documentId: id, documentCreatedAt: { $gt: timestamp } });
    return await db
      .collection<Document>('documents')
      .deleteMany({ id, createdAt: { $gt: timestamp } });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete documents by id after timestamp',
    );
  }
}

export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }) {
  try {
    const db = await getDb();
    if (suggestions.length) {
      await db.collection<Suggestion>('suggestions').insertMany(suggestions);
    }
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to save suggestions');
  }
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  try {
    const db = await getDb();
    return await db
      .collection<Suggestion>('suggestions')
      .find({ documentId })
      .toArray();
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get suggestions by document id',
    );
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    const db = await getDb();
    return await db.collection<DBMessage>('messages').find({ id }).toArray();
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get message by id');
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  try {
    const db = await getDb();
    const messages = await db
      .collection<DBMessage>('messages')
      .find({ chatId, createdAt: { $gte: timestamp } })
      .project({ id: 1 })
      .toArray();
    const messageIds = messages.map((m) => m.id);
    if (messageIds.length) {
      await db.collection<Vote>('votes').deleteMany({ chatId, messageId: { $in: messageIds } });
      await db
        .collection<DBMessage>('messages')
        .deleteMany({ chatId, id: { $in: messageIds } });
    }
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to delete messages by chat id after timestamp',
    );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  try {
    const db = await getDb();
    await db
      .collection<Chat>('chats')
      .updateOne({ id: chatId }, { $set: { visibility } });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to update chat visibility by id',
    );
  }
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  try {
    const db = await getDb();
    const since = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);
    return await db
      .collection<DBMessage>('messages')
      .countDocuments({
        role: 'user',
        createdAt: { $gte: since },
        chatId: { $in: (await db.collection<Chat>('chats').find({ userId: id }).project({ id: 1 }).toArray()).map(c => c.id) },
      });
  } catch (error) {
    throw new ChatSDKError(
      'bad_request:database',
      'Failed to get message count by user id',
    );
  }
}

export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
  try {
    const db = await getDb();
    await db.collection('streams').insertOne({ id: streamId, chatId, createdAt: new Date() });
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to create stream id');
  }
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const db = await getDb();
    const ids = await db
      .collection<Stream>('streams')
      .find({ chatId })
      .sort({ createdAt: 1 })
      .project({ id: 1, _id: 0 })
      .toArray();
    return ids.map((d) => d.id);
  } catch (error) {
    throw new ChatSDKError('bad_request:database', 'Failed to get stream ids by chat id');
  }
}
