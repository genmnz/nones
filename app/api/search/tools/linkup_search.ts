// app/api/search/tools/linkup_search.ts
import { z } from 'zod';
import { LinkupClient, type SearchDepth, type SearchResults } from 'linkup-sdk';
import { deduplicateByDomainAndUrl, extractDomain } from '@/lib/utils';
import Ajv from 'ajv';
import { 
  LinkupSearchContext, 
  LinkupQueryCompletion, 
  MultiSearchResponse,
  SearchImage,
  SearchResult,
  LinkupResultItem // Import LinkupResultItem for type safety
} from '../types/search';

export const linkupSearchSchema = z.object({
  queries: z.array(z.string()).describe('An array of search queries (typically just one when using structured output).'),
  searchDepth: z.enum(['standard', 'deep']).default('standard').describe('Search depth: "standard" (faster) or "deep" (slower, better for complex queries).'),
  exclude_domains: z.array(z.string()).optional().describe('Optional array of domains to exclude from results (applies mainly to searchResults).'),
  outputType: z.enum(['sourcedAnswer', 'searchResults', 'structured']).default('searchResults')
    .describe(`Determines the response shape:\n- 'sourcedAnswer': Natural language answer with citations.\n- 'searchResults': Raw search results.\n- 'structured': Custom JSON output based on provided schema.`),
  structuredOutputSchema: z.string().optional()
    .describe('Required JSON schema string when outputType is "structured". Defines the desired output format.'),
  maxResults: z.number().default(24)
   .describe('Maximum number of results to return for each query (applies mainly to searchResults).')
});

export type LinkupSearchParams = z.infer<typeof linkupSearchSchema>;

export async function executeLinkupSearch(
  params: LinkupSearchParams,
  { serverEnv, dataStream }: LinkupSearchContext
): Promise<MultiSearchResponse> {
  const apiKey = serverEnv.LINK_UP_KEY;
  if (!apiKey) {
    throw new Error("LINK_UP_KEY is not configured in server environment variables.");
  }
  const client = new LinkupClient({ apiKey });
  const ajv = new Ajv(); // <-- Instantiate Ajv
  console.log('Executing Linkup Search Tool with params:', params);
  const {
    queries,
    searchDepth = 'standard', // Default already set in schema, but good practice here too
    exclude_domains,
    outputType = 'searchResults', // Default already set in schema
    maxResults,
    structuredOutputSchema
  } = params;
  const excludeDomains = exclude_domains ?? [];

  // Validate structured output requirements
  if (outputType === 'structured' && !structuredOutputSchema) {
    throw new Error("structuredOutputSchema is required when outputType is 'structured'.");
  }
  if (outputType !== 'structured' && structuredOutputSchema) {
     console.warn("structuredOutputSchema provided but outputType is not 'structured'. Schema will be ignored.");
  }

  const searchPromises = queries.map(async (query, index) => {
    try {
      const depthOption = searchDepth as SearchDepth;
      const searchOptions: any = { // Use 'any' for flexibility or define a specific type
        query,
        depth: depthOption,
        outputType: outputType,
        maxResults: maxResults?? 24, 
        includeImages: true 
      };

      if (outputType === 'structured' && structuredOutputSchema) {
        try {
          const schemaObject = JSON.parse(structuredOutputSchema);
          // Validate the schema itself against the JSON Schema specification
          const validateSchema = ajv.validateSchema(schemaObject);
          if (!validateSchema) {
            // Provide detailed validation errors
            const errorDetails = ajv.errorsText(ajv.errors);
            console.error('Invalid structuredOutputSchema:', errorDetails);
            throw new Error(`Provided structuredOutputSchema is not a valid JSON Schema: ${errorDetails}`);
          }
          // If the schema is valid, assign the parsed object
          searchOptions.structuredOutputSchema = schemaObject;
        } catch (parseOrValidationError) {
          console.error('Failed to parse or validate structuredOutputSchema:', parseOrValidationError);
          // Distinguish between JSON parsing errors and schema validation errors
          const errorMessage = parseOrValidationError instanceof SyntaxError
            ? `Invalid JSON format provided for structuredOutputSchema: ${(parseOrValidationError as Error).message}`
            : (parseOrValidationError as Error).message; // Use the error message from Ajv validation
          throw new Error(errorMessage);
        }
      }

      console.log(`Linkup Search - Query ${index + 1}/${queries.length}: "${query}", Depth: ${depthOption}, Output: ${outputType}${outputType === 'structured' ? ' (with schema)' : ''}`);

      const response = await client.search(searchOptions);

      // --- Process response based on outputType ---
      let finalResults: SearchResult[] = [];
      let finalImages: SearchImage[] = [];

      if (outputType === 'structured') {
        // Structured output cannot be reliably mapped to SearchQueryResult.
        // Log it but return empty arrays for standard processing.
        console.log(`Linkup Structured Response for query "${query}":`, JSON.stringify(response, null, 2));
        // We won't attempt to map images/results here.
      } else if (outputType === 'sourcedAnswer') {
         // Assuming response structure like { answer: string, sources: [...] } - Adjust if needed
         const answerData = {
           answer: (response as any).answer ?? 'No answer provided.',
           sources: (response as any).sources ?? []
         };
         console.log(`Linkup Sourced Answer for query "${query}":`, answerData.answer);
         
         // Extract images from sources
         finalImages = (answerData.sources ?? [])
           .filter((s: any) => s.type === 'image' && s.url) // Ensure URL exists
           .map((img: any): SearchImage => ({ url: img.url, description: img.title ?? img.url }));
           
         // Convert non-image citation sources into results for MultiSearch avatars/display
         const citationSources = (answerData.sources ?? []).filter((s: any) => s.type !== 'image' && s.url);
         finalResults = citationSources.map((s: any): SearchResult => ({ 
             url: s.url, 
             title: s.title ?? s.url, 
             content: s.text ?? s.title ?? '', // Use text or title for content if available
             favicon: s.favicon || undefined, // Map favicon if present
             // Other fields are likely unavailable in sourcedAnswer citations
         }));
         // Optionally, prepend/append the main answer as a special result if needed?
         // For now, just using citations as results.

      } else { // Default to 'searchResults' processing
        // Type the raw results for better safety
        const rawResults: LinkupResultItem[] = (response as SearchResults).results ?? [];
        const deduped = deduplicateByDomainAndUrl(rawResults);
        const filtered = deduped.filter(obj => {
          const domain = extractDomain(obj.url);
          return !excludeDomains.includes(domain);
        });
        // Cap results to avoid freezing the UI
        const SAFE_MAX = 24;

        // Separate images and text results
        finalImages = filtered
          .filter(obj => obj.type === 'image')
          .map((obj): SearchImage => ({ // Explicit typing for obj based on filter
              url: obj.url, 
              description: obj.name ?? obj.title ?? obj.url 
          })) // Use name, title, or url for description
          .slice(0, SAFE_MAX); // Also cap images

        finalResults = filtered
          .filter(obj => obj.type !== 'image') // Get non-image results
          .map((obj): SearchResult => ({ // Map to SearchResult, obj is LinkupResultItem
            url: obj.url,
            title: obj.title || obj.name || '', // Use title or name
            content: obj.content || obj.text || '', // Use content or text
            raw_content: obj.raw_content ?? obj.content ?? obj.text ?? '',
            published_date: obj.published_date,
            author: obj.author,
            score: obj.score,
            favicon: obj.favicon || undefined // Map favicon if present
          }))
          .slice(0, SAFE_MAX); // Cap results

        console.log(`Linkup Search Results for query "${query}": Found ${finalResults.length} results, ${finalImages.length} images.`);
      }

      // Send completion annotation regardless of output type
      dataStream.writeMessageAnnotation({
        type: 'linkup_query_completion', // Use a specific type
        data: {
          query,
          index,
          total: queries.length,
          status: 'completed',
          outputType: outputType,
          // Use counts from the final mapped arrays
          resultsCount: finalResults.length,
          imagesCount: finalImages.length,
        },
      });

      // Return normalized structure for frontend with proper null checks
      return { 
        query, 
        results: finalResults, 
        images: finalImages 
      };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error processing Linkup query "${query}" (index ${index}):`, error);
      dataStream.writeMessageAnnotation({
        type: 'linkup_query_completion', // Use a specific type
        data: {
          query,
          index,
          total: queries.length,
          status: 'error',
          outputType: outputType, // Include outputType even in error
          errorMessage: errMsg,
          // Reset counts on error
          resultsCount: 0,
          imagesCount: 0,
        },
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
  // Return normalized structure
  return { searches };
}
