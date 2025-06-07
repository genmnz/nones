// lib\tools\exa_search.ts
import { z } from 'zod';
import Exa from 'exa-js';
import { sanitizeUrl, isValidImageUrl, deduplicateByDomainAndUrl, extractDomain } from '@/lib/utils';
import { 
  ExaSearchContext, 
  ExaSearchResultItem, 
  MultiSearchResponse,
  SearchImage,
  SearchResult
} from '../types/search';

// Define the parameter schema for the exa_search tool
export const exaSearchSchema = z.object({
  queries: z.array(z.string().describe('Array of search queries to look up using Exa neural search')),
  numResults: z.number().default(8).describe('Number of results to return per query. Default is 8'),
  useAutoprompt: z.boolean().default(true).describe('Whether to use Exa Autoprompt to enhance the query. Default is true'),
  includeDomains: z.array(z.string()).optional().describe('Optional array of domains to include in the search'),
  excludeDomains: z.array(z.string()).optional().describe('Optional array of domains to exclude from the search'),
  category: z.string().optional().describe('Category to focus on: "company", "research paper", "news", "linkedin profile", "github", "tweet", etc.'),
  type: z.enum(['auto', 'neural', 'keyword']).default('auto').describe('Type of search to perform: auto, neural, or keyword'),
  highlightSelector: z.string().optional().describe('CSS selector to highlight specific content in results'),
  snippetSelector: z.string().optional().describe('CSS selector to extract specific snippets from results'),
});

// Define the type for the parameters based on the schema
export type ExaSearchParams = z.infer<typeof exaSearchSchema>;

// Define the execute function for the exa_search tool
export async function executeExaSearch(
  { queries, numResults, useAutoprompt, includeDomains, excludeDomains, category, type, highlightSelector, snippetSelector }: ExaSearchParams,
  { serverEnv, dataStream }: ExaSearchContext
): Promise<MultiSearchResponse> {
  const apiKey = serverEnv.EXA_API_KEY;
  if (!apiKey) {
    throw new Error("EXA_API_KEY is not configured in server environment variables.");
  }
  const exa = new Exa(apiKey);

  console.log('Executing Exa Neural Search Tool...');
  console.log('Queries:', queries);
  console.log('Number of Results:', numResults);
  console.log('Use Autoprompt:', useAutoprompt);
  console.log('Include Domains:', includeDomains);
  console.log('Exclude Domains:', excludeDomains);
  console.log('Category:', category);
  console.log('Search Type:', type);

  // Execute searches in parallel
  const searchPromises = queries.map(async (query, index) => {
    try {
      // Setup search options
      const searchOptions: any = {
        type: type,
        numResults: numResults,
        useAutoprompt: useAutoprompt,
        text: true,
        highlights: true
      };

      // Add optional parameters if provided
      if (includeDomains && includeDomains.length > 0) {
        searchOptions.includeDomains = includeDomains;
      }
      if (excludeDomains && excludeDomains.length > 0) {
        searchOptions.excludeDomains = excludeDomains;
      }
      if (category) {
        searchOptions.category = category;
      }

      // Perform the search using searchAndContents which includes the actual content
      const searchResponse = await exa.searchAndContents(query, searchOptions);
      
      // Extract results from the response
      const results = Array.isArray(searchResponse.results) 
        ? searchResponse.results as ExaSearchResultItem[]
        : [];

      // Add annotation for query completion
      dataStream.writeMessageAnnotation({
        type: 'query_completion',
        data: {
          query,
          index,
          total: queries.length,
          status: 'completed',
          resultsCount: results.length,
          imagesCount: 0 // Will update after processing images
        }
      });

      // Process results to match the expected format
      const processedResults: SearchResult[] = deduplicateByDomainAndUrl(results).map((result) => ({
        url: result.url,
        title: result.title || '',
        content: result.highlights?.join('\n\n') || result.text || '',
        raw_content: result.text || '',
        published_date: result.publishedDate || undefined,
        author: result.author || undefined,
        score: result.score || undefined,
        highlight_scores: result.highlightScores || undefined,
        favicon: result.favicon || undefined
      }));

      // Extract image URLs from results if possible (less common with Exa but still possible)
      const extractedImages: Array<{ url: string; description: string }> = [];
      for (const result of results) {
        if (result.images && Array.isArray(result.images)) {
          for (const image of result.images) {
            if (typeof image === 'string' && image.trim()) {
              extractedImages.push({ url: image, description: '' });
            } else if (typeof image === 'object' && image !== null && 'url' in image) {
              extractedImages.push({ 
                url: image.url, 
                description: image.alt || (image as any).description || ''
              });
            }
          }
        }
      }

      // Process images
      const processedImages: SearchImage[] = await Promise.all(
        extractedImages.map(async ({ url, description }) => {
          const sanitizedUrl = sanitizeUrl(url);
          const imageValidation = await isValidImageUrl(sanitizedUrl);
          return imageValidation.valid
            ? {
                url: imageValidation.redirectedUrl || sanitizedUrl,
                description: description || '',
              }
            : null;
        }),
      ).then((results) =>
        results.filter(
          (image): image is SearchImage =>
            image !== null
        )
      );

      // Update the annotation with the correct image count
      dataStream.writeMessageAnnotation({
        type: 'query_completion',
        data: {
          query,
          index,
          total: queries.length,
          status: 'completed',
          resultsCount: processedResults.length,
          imagesCount: processedImages.length
        }
      });

      return { 
        query, 
        results: processedResults, 
        images: processedImages 
      };
    } catch (error) {
      console.error(`Error processing Exa query "${query}" (index ${index}):`, error);
      
      // Add error annotation
      dataStream.writeMessageAnnotation({
        type: 'query_completion',
        data: {
          query,
          index,
          total: queries.length,
          status: 'error',
          error: error instanceof Error ? error.message : String(error),
          resultsCount: 0,
          imagesCount: 0,
        }
      });
      
      // Return consistent shape for frontend with explicit empty arrays
      return { 
        query, 
        results: [], 
        images: [] 
      };
    }
  });

  const searches = await Promise.all(searchPromises);

  return {
    searches,
  };
} 