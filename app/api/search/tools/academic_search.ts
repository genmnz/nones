// app/api/search/tools/academic_search.ts
import { z } from 'zod';
import Exa from 'exa-js';

export const academicSearchSchema = z.object({
  query: z.string().describe('The search query'),
});

type Context = {
  serverEnv: any;
};

export async function executeAcademicSearch(
  { query }: z.infer<typeof academicSearchSchema>,
  context: Context,
) {
  const { serverEnv } = context;
  try {
    const exa = new Exa(serverEnv.EXA_API_KEY as string);

    // Search academic papers with content summary
    const result = await exa.searchAndContents(query, {
      type: 'auto',
      numResults: 20,
      category: 'research paper',
      summary: {
        query: 'Abstract of the Paper',
      },
    });

    // Process and clean results
    const processedResults = result.results.reduce<typeof result.results>((acc, paper) => {
      // Skip if URL already exists or if no summary available
      if (acc.some((p) => p.url === paper.url) || !paper.summary) return acc;

      // Clean up summary (remove "Summary:" prefix if exists)
      const cleanSummary = paper.summary.replace(/^Summary:\s*/i, '');

      // Clean up title (remove [...] suffixes)
      const cleanTitle = paper.title?.replace(/\s\[.*?\]$/, '');

      acc.push({
        ...paper,
        title: cleanTitle || 'No Title Available',
        summary: cleanSummary,
      });

      return acc;
    }, []);

    return {
      results: processedResults,
    };
  } catch (error) {
    console.error('Academic search error:', error);
    throw error;
  }
}
