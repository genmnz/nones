// @app/search/[id]/page.tsx
import { notFound } from 'next/navigation';
import { ChatInterface } from '@/components/tools/chat-interface';
import { getUser } from '@/lib/auth-utils';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { Message } from '@/lib/db/schema';

export { generateMetadata } from './metadata';
export const dynamic = 'force-dynamic';
// export const revalidate = 0; // Disables ISR (Incremental Static Regeneration) — no caching at all.

interface UIMessage {
  id: string;
  parts: any;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  createdAt: Date;
  experimental_attachments?: Array<any>;
}

function convertToUIMessages(messages: Array<Message>): Array<UIMessage> {
  return messages.map((message) => {
    // Ensure parts are properly structured
    let processedParts = message.parts;

    // If parts is missing or empty for a user message, create a text part from empty string
    if (message.role === 'user' && (!processedParts || !Array.isArray(processedParts) || processedParts.length === 0)) {
      // Create an empty text part since there's no content property in DBMessage
      processedParts = [{
        type: 'text',
        text: '',
      }];
    }

    // Extract content from parts or use empty string
    const content = processedParts && Array.isArray(processedParts)
      ? processedParts.filter((part: any) => part.type === 'text').map((part: any) => part.text).join('\n')
      : '';

    return {
      id: message.id,
      parts: processedParts,
      role: message.role as UIMessage['role'],
      content,
      createdAt: message.createdAt,
      experimental_attachments: (message.attachments as Array<any>) ?? [],
    };
  });
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  const chat = await getChatById({ id });

  if (!chat) {
    notFound();
  }

  console.log("Chat: ", chat);
  const user = await getUser();

  if (chat.visibility === 'private') {
    if (!user) return notFound();
    if (user.id !== chat.userId) return notFound();
  }

  // Fetch only the initial 20 messages for faster loading
  const messagesFromDb = await getMessagesByChatId({
    id,
    offset: 0
  });

  console.log("Messages from DB: ", messagesFromDb);

  const initialMessages = convertToUIMessages(messagesFromDb);

  // Determine if the current user owns this chat
  const isOwner = user ? user.id === chat.userId : false;

  return (
    <ChatInterface
      initialChatId={id}
      initialMessages={initialMessages}
      initialVisibility={chat.visibility as 'public' | 'private'}
      isOwner={isOwner}
    />
  );
} 