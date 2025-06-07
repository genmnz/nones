import { z } from 'zod';
import { tavily } from '@tavily/core';

export const redditSearchSchema = z.object({
  query: z.string().describe('The exact search query from the user.'),
  maxResults: z.number().describe('Maximum number of results to return. Default is 20.'),
  timeRange: z.enum(['day', 'week', 'month', 'year']).describe('Time range for Reddit search.'),
});

export type RedditSearchParams = z.infer<typeof redditSearchSchema>;

interface RedditSearchContext {
  serverEnv: {
    TAVILY_API_KEY?: string;
  };
}

export async function executeRedditSearch(
  {
    query,
    maxResults = 20,
    timeRange = 'week',
  }: RedditSearchParams,
  { serverEnv }: RedditSearchContext,
) {
  const apiKey = serverEnv.TAVILY_API_KEY;
  const tvly = tavily({ apiKey });

  console.log('Reddit search query:', query);
  console.log('Max results:', maxResults);
  console.log('Time range:', timeRange);

  try {
    const data = await tvly.search(query, {
      maxResults: maxResults,
      timeRange: timeRange,
      // includeRawContent: true,
      includeRawContent: 'markdown',
      searchDepth: 'basic',
      topic: 'general',
      includeDomains: ["reddit.com"],
    });

    console.log("data", data);

    // Process results for better display
    const processedResults = data.results.map(result => {
      // Extract Reddit post metadata
      const isRedditPost = result.url.includes('/comments/');
      const subreddit = isRedditPost ?
        result.url.match(/reddit\.com\/r\/([^/]+)/)?.[1] || 'unknown' :
        'unknown';

      // Don't attempt to parse comments - treat content as a single snippet
      // The Tavily API already returns short content snippets
      return {
        url: result.url,
        title: result.title,
        content: result.content || '',
        score: result.score,
        published_date: result.publishedDate,
        subreddit,
        isRedditPost,
        // Keep original content as a single comment/snippet
        comments: result.content ? [result.content] : []
      };
    });

    return {
      query,
      results: processedResults,
      timeRange,
    };
  } catch (error) {
    console.error('Reddit search error:', error);
    throw error;
  }
}
