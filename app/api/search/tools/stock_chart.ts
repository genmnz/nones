import { z } from 'zod';
import { Daytona, SandboxTargetRegion } from '@daytonaio/sdk';
import { tavily } from '@tavily/core';
import Exa from 'exa-js';
import { generateObject } from 'ai';
import { mind } from '@/ai/providers';
import { CURRENCY_SYMBOLS } from '@/types/search';

export const stockChartSchema = z.object({
  title: z.string().describe('The title of the chart.'),
  news_queries: z.array(z.string()).describe('The news queries to search for.'),
  icon: z
    .enum(['stock', 'date', 'calculation', 'default'])
    .describe('The icon to display for the chart.'),
  stock_symbols: z.array(z.string()).describe('The stock symbols to display for the chart.'),
  currency_symbols: z.array(z.string()).describe('The currency symbols for each stock/asset in the chart. Available symbols: ' + Object.keys(CURRENCY_SYMBOLS).join(', ') + '. Defaults to USD if not provided.'),
  interval: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max']).describe('The interval of the chart. default is 1y.'),
});

type Context = {
  serverEnv: any;
  exa: Exa;
};

export async function executeStockChart(
  { title, icon, stock_symbols, currency_symbols, interval, news_queries }: z.infer<typeof stockChartSchema>,
  context: Context,
) {
  const { serverEnv, exa } = context;
  // Format currency symbols with actual symbols
  const formattedCurrencySymbols = (currency_symbols || stock_symbols.map(() => 'USD')).map(currency => {
    const symbol = CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS];
    return symbol || currency; // Fallback to currency code if symbol not found
  });

  interface NewsResult {
    title: string;
    url: string;
    content: string;
    published_date?: string;
    category: string;
    query: string;
  }

  interface NewsGroup {
    query: string;
    topic: string;
    results: NewsResult[];
  }

  let news_results: NewsGroup[] = [];

  const tvly = tavily({ apiKey: serverEnv.TAVILY_API_KEY });

  // Gather all news search promises to execute in parallel
  const searchPromises = [];
  for (const query of news_queries) {
    // Add finance and news topic searches for each query
    searchPromises.push({
      query,
      topic: 'finance',
      promise: tvly.search(query, {
        topic: 'finance',
        days: 7,
        maxResults: 3,
        searchDepth: 'advanced',
      })
    });

    searchPromises.push({
      query,
      topic: 'news',
      promise: tvly.search(query, {
        topic: 'news',
        days: 7,
        maxResults: 3,
        searchDepth: 'advanced',
      })
    });
  }

  // Execute all searches in parallel
  const searchResults = await Promise.all(
    searchPromises.map(({ promise }) => promise.catch(err => ({
      results: [],
      error: err.message
    })))
  );

  // Process results and deduplicate
  const urlSet = new Set();
  searchPromises.forEach(({ query, topic }, index) => {
    const result = searchResults[index];
    if (!result.results) return;

    const processedResults = result.results
      .filter(item => {
        // Skip if we've already included this URL
        if (urlSet.has(item.url)) return false;
        urlSet.add(item.url);
        return true;
      })
      .map(item => ({
        title: item.title,
        url: item.url,
        content: item.content.slice(0, 30000),
        published_date: item.publishedDate,
        category: topic,
        query: query
      }));

    if (processedResults.length > 0) {
      news_results.push({
        query,
        topic,
        results: processedResults
      });
    }
  });

  // Perform Exa search for financial reports
  const exaResults: NewsGroup[] = [];
  try {
    // Run Exa search for each stock symbol
    const exaSearchPromises = stock_symbols.map(symbol =>
      exa.searchAndContents(
        `${symbol} financial report analysis`,
        {
          text: true,
          category: "financial report",
          livecrawl: "always",
          type: "auto",
          numResults: 10,
          summary: {
            query: "all important information relevent to the important for investors"
          }
        }
      ).catch(error => {
        console.error(`Exa search error for ${symbol}:`, error);
        return { results: [] };
      })
    );

    const exaSearchResults = await Promise.all(exaSearchPromises);

    // Process Exa results
    const exaUrlSet = new Set();
    exaSearchResults.forEach((result, index) => {
      if (!result.results || result.results.length === 0) return;

      const stockSymbol = stock_symbols[index];
      const processedResults = result.results
        .filter(item => {
          if (exaUrlSet.has(item.url)) return false;
          exaUrlSet.add(item.url);
          return true;
        })
        .map(item => ({
          title: item.title || "",
          url: item.url,
          content: item.summary || "",
          published_date: item.publishedDate,
          category: "financial",
          query: stockSymbol
        }));

      if (processedResults.length > 0) {
        exaResults.push({
          query: stockSymbol,
          topic: "financial",
          results: processedResults
        });
      }
    });

    // Complete missing titles for financial reports #flag
    for (const group of exaResults) {
      for (let i = 0; i < group.results.length; i++) {
        const result = group.results[i];
        if (!result.title || result.title.trim() === "") {
          try {
            const { object } = await generateObject({
              model: mind.languageModel("mind-google-flash-2.0"),
              prompt: `Complete the following financial report with an appropriate title. The report is about ${group.query} and contains this content: ${result.content.substring(0, 500)}...`,
              schema: z.object({
                title: z.string().describe("A descriptive title for the financial report")
              }),
            });
            group.results[i].title = object.title;
          } catch (error) {
            console.error(`Error generating title for ${group.query} report:`, error);
            group.results[i].title = `${group.query} Financial Report`;
          }
        }
      }
    }

    // Merge Exa results with news results
    news_results = [...news_results, ...exaResults];
  } catch (error) {
    console.error("Error fetching Exa financial reports:", error);
  }

  const code = `
import yfinance as yf
import matplotlib.pyplot as plt
import pandas as pd
from datetime import datetime

${stock_symbols.map(symbol =>
    `${symbol.toLowerCase().replace('.', '')} = yf.download('${symbol}', period='${interval}', interval='1d')`).join('\n')}

# Create the plot
plt.figure(figsize=(10, 6))
${stock_symbols.map(symbol => `
# Convert datetime64 index to strings to make it serializable
${symbol.toLowerCase().replace('.', '')}.index = ${symbol.toLowerCase().replace('.', '')}.index.strftime('%Y-%m-%d')
plt.plot(${symbol.toLowerCase().replace('.', '')}.index, ${symbol.toLowerCase().replace('.', '')}['Close'], label='${symbol} ${formattedCurrencySymbols[stock_symbols.indexOf(symbol)]}', color='blue')
`).join('\n')}

# Customize the chart
plt.title('${title}')
plt.xlabel('Date')
plt.ylabel('Closing Price')
plt.legend()
plt.grid(True)
plt.show()`

  console.log('Code:', code);

  const daytona = new Daytona()
  const sandbox = await daytona.create({
    image: "mind-analysis:1749032298",
    language: 'python',
    target: SandboxTargetRegion.US,
    resources: {
      cpu: 2,
      memory: 5,
      disk: 10,
    },
    autoStopInterval: 0
  })

  const execution = await sandbox.process.codeRun(code);
  let message = '';

  if (execution.result) {
    message += execution.result;
  }


  if (execution.artifacts?.stdout) {
    message += execution.artifacts.stdout;
  }

  console.log("execution exit code: ", execution.exitCode)
  console.log("execution result: ", execution.result)

  console.log("Chart details: ", execution.artifacts?.charts)
  if (execution.artifacts?.charts) {
    console.log("showing chart")
    execution.artifacts.charts[0].elements.map((element: any) => {
      console.log(element.points);
    });
  }

  if (execution.artifacts?.charts === undefined) {
    console.log("No chart found");
  }

  await sandbox.delete();

  // map the chart to the correct format for the frontend and remove the png property
  const chart = execution.artifacts?.charts?.[0] ?? undefined;
  const chartData = chart ? {
    type: chart.type,
    title: chart.title,
    elements: chart.elements,
    png: undefined
  } : undefined;

  return {
    message: message.trim(),
    chart: chartData,
    currency_symbols: formattedCurrencySymbols,
    news_results: news_results
  };
}
