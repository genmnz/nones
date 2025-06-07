import { z } from 'zod';
import { getTweet } from 'react-tweet/api';

export const xSearchSchema = z.object({
  query: z.string().describe('The search query for X posts'),
  startDate: z.string().describe('The start date of the search in the format YYYY-MM-DD (default to 7 days ago if not specified)'),
  endDate: z.string().describe('The end date of the search in the format YYYY-MM-DD (default to today if not specified)'),
  xHandles: z.array(z.string()).optional().describe('Optional list of X handles/usernames to search from (without @ symbol). Only include if user explicitly mentions specific handles like "@elonmusk" or "@openai"'),
  maxResults: z.number().optional().default(15).describe('Maximum number of search results to return (default 15)'),
});

export type XSearchParams = z.infer<typeof xSearchSchema>;

interface XSearchContext {
  serverEnv: {
    XAI_API_KEY?: string;
  };
}

export async function executeXSearch(
  {
    query,
    startDate,
    endDate,
    xHandles,
    maxResults = 15,
  }: XSearchParams,
  { serverEnv }: XSearchContext,
) {
  try {
    const searchParameters: any = {
      mode: "on",
      from_date: startDate,
      to_date: endDate,
      max_search_results: maxResults < 5 ? 5 : maxResults,
      return_citations: true,
      sources: [
        xHandles && xHandles.length > 0 
          ? { type: "x", x_handles: xHandles, safe_search: false }
          : { type: "x", safe_search: false }
      ]
    };

    console.log("[X search parameters]: ", searchParameters);
    console.log("[X search handles]: ", xHandles);

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serverEnv.XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3-mini',
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that searches for X posts and returns the results in a structured format. You will be given a search query and a list of X handles to search from. You will then search for the posts and return the results in a structured format. You will also cite the sources in the format [Source No.]. Go very deep in the search and return the most relevant results.`
          },
          {
            role: 'user',
            content: `${query}.`
          }
        ],
        search_parameters: searchParameters,
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[X search data]: ", data);
    
    // Transform citations into sources with tweet text
    const sources = [];
    const citations = data.citations || [];
    
    if (citations.length > 0) {
      // Extract tweet IDs and fetch tweet data using react-tweet
      const tweetFetchPromises = citations
        .filter((url: any) => typeof url === 'string' && url.includes('x.com'))
        .map(async (url: string) => {
          try {
            // Extract tweet ID from URL
            const match = url.match(/\/status\/(\d+)/);
            if (!match) return null;
            
            const tweetId = match[1];
            
            // Fetch tweet data using react-tweet API
            const tweetData = await getTweet(tweetId);
            if (!tweetData) return null;
            
            const text = tweetData.text;
            if (!text) return null;
            
            return {
              text: text,
              link: url
            };
          } catch (error) {
            console.error(`Error fetching tweet data for ${url}:`, error);
            return null;
          }
        });
      
      // Wait for all tweet fetches to complete
      const tweetResults = await Promise.all(tweetFetchPromises);
      
      // Filter out null results and add to sources
      sources.push(...tweetResults.filter(result => result !== null));
    }
    
    return {
      content: data.choices[0]?.message?.content || '',
      citations: citations,
      sources: sources,
      query,
      dateRange: `${startDate} to ${endDate}`,
      handles: xHandles || [],
    };
  } catch (error) {
    console.error('X search error:', error);
    throw error;
  }
}
