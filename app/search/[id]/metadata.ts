// @app/search/[id]/metadata.ts
import { getUser } from '@/lib/auth-utils';
import { getChatById } from '@/lib/db/queries';
import { Metadata } from 'next';

// metadata
// export async function generateMetadata({ params }: { params: { id: string } }) {
//   const id = params.id;
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const chat = await getChatById({ id });
  const user = await getUser();
  // if not chat, return Scira Chat
  if (!chat) {
    return { title: 'Scira Chat' };
  }
  let title;
  // if chat is public, return title
  if (chat.visibility === 'public') {
    title = chat.title;
  }
  // if chat is private, return title
  if (chat.visibility === 'private') {
    if (!user) title = 'Scira Chat';
    if (user!.id !== chat.userId) title = 'Scira Chat';
    title = chat.title;
  }
  return {
    title: title, description: "A search in mind.ai",
    openGraph: {
      title: title,
      url: `https://mind.ai/s/${id}`,
      description: "A search in mind.ai",
      siteName: "mind.ai",
      images: [{
        url: `https://mind.ai/api/og/chat/${id}`,
        width: 1200,
        height: 630,
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      url: `https://mind.ai/s/${id}`,
      description: "A search in mind.ai",
      siteName: "mind.ai",
      creator: "@sciraai",
      images: [{
        url: `https://mind.ai/api/og/chat/${id}`,
        width: 1200,
        height: 630,
      }],
    },
    alternates: {
      canonical: `https://mind.ai/s/${id}`,
    },
  } as Metadata;
}