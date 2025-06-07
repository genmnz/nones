import { z } from 'zod';
import Exa from 'exa-js';
import { VideoResult } from '@/types/search';

export const youtubeSearchSchema = z.object({
  query: z.string().describe('The search query for YouTube videos'),
});

export type YoutubeSearchParams = z.infer<typeof youtubeSearchSchema>;

interface YoutubeSearchContext {
  serverEnv: {
    EXA_API_KEY?: string;
    YT_ENDPOINT?: string;
  };
}

export async function executeYoutubeSearch(
  { query }: YoutubeSearchParams,
  { serverEnv }: YoutubeSearchContext,
) {
  try {
    const exa = new Exa(serverEnv.EXA_API_KEY as string);

    // Simple search to get YouTube URLs only
    const searchResult = await exa.search(query, {
      type: 'keyword',
      numResults: 10,
      includeDomains: ['youtube.com'],
    });

    // Process results
    const processedResults = await Promise.all(
      searchResult.results.map(async (result): Promise<VideoResult | null> => {
        const videoIdMatch = result.url.match(
          /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/]+)/,
        );
        const videoId = videoIdMatch?.[1];

        if (!videoId) return null;

        // Base result
        const baseResult: VideoResult = {
          videoId,
          url: result.url,
        };

        try {
          // Fetch detailed info from our endpoints
          const [detailsResponse, captionsResponse, timestampsResponse] = await Promise.all([
            fetch(`${serverEnv.YT_ENDPOINT}/video-data`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: result.url,
              }),
            }).then((res) => (res.ok ? res.json() : null)),
            fetch(`${serverEnv.YT_ENDPOINT}/video-captions`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: result.url,
              }),
            }).then((res) => (res.ok ? res.text() : null)),
            fetch(`${serverEnv.YT_ENDPOINT}/video-timestamps`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                url: result.url,
              }),
            }).then((res) => (res.ok ? res.json() : null)),
          ]);

          // Return combined data
          return {
            ...baseResult,
            details: detailsResponse || undefined,
            captions: captionsResponse || undefined,
            timestamps: timestampsResponse || undefined,
          };
        } catch (error) {
          console.error(`Error fetching details for video ${videoId}:`, error);
          return baseResult;
        }
      }),
    );

    // Filter out null results
    const validResults = processedResults.filter(
      (result): result is VideoResult => result !== null,
    );

    return {
      results: validResults,
    };
  } catch (error) {
    console.error('YouTube search error:', error);
    throw error;
  }
}
