import { z } from 'zod';

export const mcpSearchSchema = z.object({
  query: z.string().describe('The query to search for'),
});

export type McpSearchParams = z.infer<typeof mcpSearchSchema>;

interface McpSearchContext {
  serverEnv: {
    SMITHERY_API_KEY?: string;
  };
}

export async function executeMcpSearch(
  { query }: McpSearchParams,
  { serverEnv }: McpSearchContext,
) {
  try {
    // Call the Smithery Registry API
    const response = await fetch(
      `https://registry.smithery.ai/servers?q=${encodeURIComponent(query)}`,
      {
        headers: {
          'Authorization': `Bearer ${serverEnv.SMITHERY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Smithery API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Get detailed information for each server
    const detailedServers = await Promise.all(
      data.servers.map(async (server: any) => {
        const detailResponse = await fetch(
          `https://registry.smithery.ai/servers/${encodeURIComponent(server.qualifiedName)}`,
          {
            headers: {
              'Authorization': `Bearer ${serverEnv.SMITHERY_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!detailResponse.ok) {
          console.warn(`Failed to fetch details for ${server.qualifiedName}`);
          return server;
        }

        const details = await detailResponse.json();
        return {
          ...server,
          deploymentUrl: details.deploymentUrl,
          connections: details.connections,
        };
      })
    );

    return {
      servers: detailedServers,
      pagination: data.pagination,
      query: query
    };
  } catch (error) {
    console.error('Smithery search error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      query: query
    };
  }
}
