import { z } from 'zod';
import { tavily } from '@tavily/core';
import { deduplicateByDomainAndUrl, sanitizeUrl, isValidImageUrl } from '@/lib/utils';

export const webSearchSchema = z.object({
  queries: z.array(z.string().describe('Array of search queries to look up on the web. Default is 5 to 10 queries.')),
  maxResults: z.array(
    z.number().describe('Array of maximum number of results to return per query. Default is 10.'),
  ),
  topics: z.array(
    z.enum(['general', 'news', 'finance']).describe('Array of topic types to search for. Default is general.'),
  ),
  searchDepth: z.array(
    z.enum(['basic', 'advanced']).describe('Array of search depths to use. Default is basic. Use advanced for more detailed results.'),
  ),
  include_domains: z
    .array(z.string())
    .describe('A list of domains to include in all search results. Default is an empty list.'),
  exclude_domains: z
    .array(z.string())
    .describe('A list of domains to exclude from all search results. Default is an empty list.'),
});

export type WebSearchParams = z.infer<typeof webSearchSchema>;

interface WebSearchContext {
  serverEnv: {
    TAVILY_API_KEY?: string;
  };
  dataStream: any;
}

export async function executeWebSearch(
  {
    queries,
    maxResults,
    topics,
    searchDepth,
    include_domains,
    exclude_domains,
  }: WebSearchParams,
  { serverEnv, dataStream }: WebSearchContext,
) {
  const apiKey = serverEnv.TAVILY_API_KEY;
  const tvly = tavily({ apiKey });
  const includeImageDescriptions = true;

  // Execute searches in parallel
  const searchPromises = queries.map(async (query, index) => {
    const data = await tvly.search(query, {
      topic: topics[index] || topics[0] || 'general',
      days: topics[index] === 'news' ? 7 : undefined,
      maxResults: maxResults[index] || maxResults[0] || 10,
      searchDepth: searchDepth[index] || searchDepth[0] || 'basic',
      includeAnswer: true,
      includeImages: true,
      includeImageDescriptions: includeImageDescriptions,
      excludeDomains: exclude_domains || undefined,
      includeDomains: include_domains || undefined,
    });

    // Add annotation for query completion
    if (dataStream) {
      dataStream.writeMessageAnnotation({
        type: 'query_completion',
        data: {
          query,
          index,
          total: queries.length,
          status: 'completed',
          resultsCount: data.results.length,
          imagesCount: data.images.length
        }
      });
    }

    return {
      query,
      results: deduplicateByDomainAndUrl(data.results).map((obj: any) => ({
        url: obj.url,
        title: obj.title,
        content: obj.content,
        published_date: topics[index] === 'news' ? obj.published_date : undefined,
      })),
      images: includeImageDescriptions
        ? await Promise.all(
            deduplicateByDomainAndUrl(data.images).map(
              async ({ url, description }: { url: string; description?: string }) => {
                const sanitizedUrl = sanitizeUrl(url);
                const imageValidation = await isValidImageUrl(sanitizedUrl);
                return imageValidation.valid
                  ? {
                      url: imageValidation.redirectedUrl || sanitizedUrl,
                      description: description ?? '',
                    }
                  : null;
              },
            ),
          ).then((results) =>
            results.filter(
              (image): image is { url: string; description: string } =>
                image !== null &&
                typeof image === 'object' &&
                typeof image.description === 'string' &&
                image.description !== '',
            ),
          )
        : await Promise.all(
            deduplicateByDomainAndUrl(data.images).map(async ({ url }: { url: string }) => {
              const sanitizedUrl = sanitizeUrl(url);
              const imageValidation = await isValidImageUrl(sanitizedUrl);
              return imageValidation.valid ? (imageValidation.redirectedUrl || sanitizedUrl) : null;
            }),
          ).then((results) => results.filter((url) => url !== null) as string[]),
    };
  });

  const searchResults = await Promise.all(searchPromises);

  return {
    searches: searchResults,
  };
}
