import { z } from 'zod';
import { MultiSearchResponse, SearchQueryResult, SearchResult, SearchImage } from '../types/search';

// Define the parameter schema for the DuckDuckGo search tool
export const duckDuckGoSearchSchema = z.object({
    queries: z.array(z.string().describe('Array of search queries to look up on DuckDuckGo. Default is a single query.')),
    maxResults: z.number().default(10).describe('Maximum number of results to return per query. Default is 10.'),
    exclude_domains: z.array(z.string()).default([]).describe('A list of domains to exclude from all search results. Default is an empty list.')
});

// Define the type for the parameters based on the schema
export type DuckDuckGoSearchParams = z.infer<typeof duckDuckGoSearchSchema>;

// Define the execute function for the DuckDuckGo search tool
export async function executeDuckDuckGoSearch(
    { queries, maxResults, exclude_domains }: DuckDuckGoSearchParams,
    { serverEnv, dataStream }: { serverEnv: { RAPIDAPI_KEY?: string; RAPIDAPI_HOST?: string }; dataStream: any }
): Promise<MultiSearchResponse> {
    const apiKey = serverEnv.RAPIDAPI_KEY;
    const apiHost = serverEnv.RAPIDAPI_HOST || 'duckduckgo8.p.rapidapi.com';
    if (!apiKey) {
        throw new Error('RAPIDAPI_KEY is not configured in server environment variables.');
    }

    console.log('Executing DuckDuckGo Search Tool...');
    console.log('Queries:', queries);
    console.log('Max Results:', maxResults);
    console.log('Exclude Domains:', exclude_domains);

    // Execute searches in parallel
    const searchPromises = queries.map(async (query, index) => {
        try {
            const url = `https://${apiHost}/?q=${encodeURIComponent(query)}`;
            const options = {
                method: 'GET',
                headers: {
                    'x-rapidapi-key': apiKey,
                    'x-rapidapi-host': apiHost
                }
            };

            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            console.log(`DuckDuckGo Search Response for query "${query}":`, data);

            if (!data || data.status !== 'success' || !data.results) {
                dataStream.writeMessageAnnotation({
                    type: 'query_completion',
                    data: {
                        query,
                        index,
                        total: queries.length,
                        status: 'completed',
                        resultsCount: 0,
                        imagesCount: 0
                    }
                });
                return { query, results: [], images: [] };
            }

            // Process results to match SearchResult format
            const processedResults: SearchResult[] = data.results
                .filter((result: any) => {
                    const domain = new URL(result.url).hostname;
                    return !exclude_domains.includes(domain);
                })
                .slice(0, maxResults)
                .map((result: any) => ({
                    url: result.url,
                    title: result.title,
                    content: result.description,
                    raw_content: result.description_html,
                    favicon: `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(result.url)}`
                }));

            // DuckDuckGo API does not return images in this response, so images array is empty
            const processedImages: SearchImage[] = [];

            // Add annotation for query completion
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
            console.error(`Error processing DuckDuckGo query "${query}":`, error);
            const errMsg = error instanceof Error ? error.message : String(error);
            dataStream.writeMessageAnnotation({
                type: 'query_completion',
                data: {
                    query,
                    index,
                    total: queries.length,
                    status: 'error',
                    resultsCount: 0,
                    imagesCount: 0,
                    error: errMsg
                }
            });
            return { query, results: [], images: [] };
        }
    });

    const searchResults = await Promise.all(searchPromises);

    return {
        searches: searchResults
    };
} 