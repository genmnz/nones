// /app/api/chat/route.ts
import { generateTitleFromUserMessage, getGroupConfig } from '@/app/actions';
import { serverEnv } from '@/env/server';
import {
    convertToCoreMessages,
    smoothStream,
    streamText,
    tool,
    generateObject,
    Tool,
    NoSuchToolError,
    CoreMessage,
    appendResponseMessages,
    CoreToolMessage,
    CoreUserMessage,
    CoreSystemMessage,
    CoreAssistantMessage,
    createDataStream,
    ToolSet
} from 'ai';
import Exa from 'exa-js';
import { extremeSearchTool } from '@/ai/extreme-search';
import { mind, providerOptions } from '@/ai/providers';
import { getUser } from "@/lib/auth-utils";
import { createStreamId, getChatById, getMessagesByChatId, getStreamIdsByChatId, saveChat, saveMessages } from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import {
    createResumableStreamContext,
    type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { differenceInSeconds } from 'date-fns';
import { Chat } from '@/lib/db/schema';
import { auth } from '@/lib/auth';
import { v4 as uuidv4 } from 'uuid';
import { geolocation } from "@vercel/functions";
import {
    executeStockChart, stockChartSchema,
    executeCurrencyConverter, currencyConverterSchema,
    executeXSearch, xSearchSchema,
    executeRetrieve, retrieveSchema,
    executeYoutubeSearch, youtubeSearchSchema,
    executeCodeInterpreter, codeInterpreterSchema,
    executeGetWeatherData, weatherSchema,
    executeTextTranslate, textTranslateSchema,
    executeWebSearch, webSearchSchema,
    executeMovieOrTvSearch, movieOrTvSearchSchema,
    executeTrendingMovies, trendingMoviesSchema,
    executeTrendingTv, trendingTvSchema,
    executeAcademicSearch, academicSearchSchema,
    executeTrackFlight, trackFlightSchema,
    executeDatetime, datetimeSchema,
    executeMcpSearch, mcpSearchSchema,
    executeMemoryManager, memoryManagerSchema,
    executeRedditSearch, redditSearchSchema,
    executeFindPlaceOnMap, findPlaceOnMapSchema,
    executeExaSearch, exaSearchSchema,
    executeLinkupSearch, linkupSearchSchema,
    executeDuckDuckGoSearch, duckDuckGoSearchSchema,
} from './tools/index';
import { executeNearbyPlacesSearch, nearbyPlacesSearchSchema } from './tools/nearby_search';

// import { executeWolframAlpha, wolframAlphaSchema } from './tools/wolfram_alpha';

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getTrailingMessageId({
    messages,
}: {
    messages: Array<ResponseMessage>
}): string | null {
    const trailingMessage = messages.at(-1);

    if (!trailingMessage) return null;

    return trailingMessage.id;
}


let globalStreamContext: ResumableStreamContext | null = null;

function getStreamContext() {
    if (!globalStreamContext) {
        try {
            globalStreamContext = createResumableStreamContext({
                waitUntil: after,
            });
        } catch (error: any) {
            if (error.message.includes('REDIS_URL')) {
                console.log(
                    ' > Resumable streams are disabled due to missing REDIS_URL',
                );
            } else {
                console.error(error);
            }
        }
    }

    return globalStreamContext;
}



const exa = new Exa(serverEnv.EXA_API_KEY);

// Modify the POST function to use the new handler
export async function POST(req: Request) {
    const { messages, model, group, timezone, id, selectedVisibilityType } = await req.json();
    // const { latitude, longitude } = geolocation(req);
    
    // Enhanced security checks
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const userAgent = req.headers.get('user-agent');
    const allowedOrigins = serverEnv.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());

    // Check for bot/automated requests
    const suspiciousUserAgents = [
        'curl', 'wget', 'python-requests', 'axios', 'node-fetch', 'PostmanRuntime',
        'insomnia', 'httpie', 'RestSharp', 'okhttp'
    ];
    
    const isSuspiciousBot = suspiciousUserAgents.some(agent => 
        userAgent?.toLowerCase().includes(agent.toLowerCase())
    );

    // Basic origin validation
    const isValidOrigin = origin && allowedOrigins.includes(origin);
    const isValidReferer = referer && allowedOrigins.some(allowed => referer.startsWith(allowed));

    // For public chats, require authentication OR valid origin/referer
    if (selectedVisibilityType === 'public') {
        const user = await getUser();
        if (!user && (!isValidOrigin && !isValidReferer)) {
            console.log(`Blocked unauthorized public chat request - Origin: ${origin}, Referer: ${referer}, UA: ${userAgent}`);
            return new ChatSDKError('forbidden:chat').toResponse();
        }
        // Block suspicious bots even for authenticated users on public chats
        if (isSuspiciousBot && !user) {
            console.log(`Blocked suspicious bot request - UA: ${userAgent}`);
            return new ChatSDKError('forbidden:chat').toResponse();
        }
    } else {
        // For private chats, require valid origin or referer (more permissive for legitimate users)
        if (!isValidOrigin && !isValidReferer) {
            console.log(`Blocked unauthorized private chat request - Origin: ${origin}, Referer: ${referer}`);
            return new ChatSDKError('forbidden:chat').toResponse();
        }
        // Block obvious bots
        if (isSuspiciousBot) {
            console.log(`Blocked bot request on private chat - UA: ${userAgent}`);
            return new ChatSDKError('forbidden:chat').toResponse();
        }
    }

    // console.log("--------------------------------");
    // console.log("Location: ", latitude, longitude);
    // console.log("--------------------------------");

    const user = await getUser();
    const streamId = "stream-" + uuidv4();

    if (!user) {
        console.log("User not found");
    }

    const { tools: activeTools, instructions } = await getGroupConfig(group);

    if (user) {
        const chat = await getChatById({ id });

        if (!chat) {
            const title = await generateTitleFromUserMessage({
                message: messages[messages.length - 1],
            });

            console.log("Title: ", title);
            console.log("--------------------------------");

            await saveChat({
                id,
                userId: user.id,
                title,
                visibility: selectedVisibilityType,
            });
        } else {
            if (chat.userId !== user.id) {
                return new ChatSDKError('forbidden:chat').toResponse();
            }
        }


        await saveMessages({
            messages: [
                {
                    chatId: id,
                    id: messages[messages.length - 1].id,
                    role: 'user',
                    parts: messages[messages.length - 1].parts,
                    attachments: messages[messages.length - 1].experimental_attachments ?? [],
                    createdAt: new Date(),
                },
            ],
        });

        console.log("--------------------------------");
        console.log("Messages saved: ", messages);
        console.log("--------------------------------");

        await createStreamId({ streamId, chatId: id });
    }

    console.log("Messages: ", messages);
    console.log("--------------------------------");
    console.log("Running with model: ", model.trim());
    console.log("Group: ", group);
    console.log("Timezone: ", timezone);

    const stream = createDataStream({
        execute: async (dataStream) => {
            const result = streamText({
                model: mind.languageModel(model),
                messages: convertToCoreMessages(messages),
                ...(!model.includes('mind-anthropic') || !model.includes('mind-o4-mini') ? {
                    temperature: 0,
                } : (!model.includes('mind-qwq') ? {
                    temperature: 0.6,
                    topP: 0.95,
                } : {
                    temperature: 0,
                })),
                maxSteps: 5,
                maxRetries: 3,
                experimental_activeTools: [...activeTools],
                // system: instructions + `\n\nThe user's location is ${latitude}, ${longitude}.`,
                system: instructions,
                toolChoice: 'auto',
                // experimental_transform: smoothStream({
                //     chunking: 'word',
                //     delayInMs: 1,
                // }),

                // experimental_transform: smoothStream({
                //     chunking: 'word',
                //     delayInMs: 1,
                // }),
                providerOptions: providerOptions(model, group),
                tools: {
                    exa_search: {
                        description: 'Search the web using Exa neural search that understands the semantic meaning of queries.',
                        parameters: exaSearchSchema,
                        execute: async (params) => executeExaSearch(params, { serverEnv, dataStream }),
                      },
                      web_search: tool({
                        description: 'Search the web for information with 5-10 queries, max results and search depth.',
                        parameters: webSearchSchema,
                        execute: async (params) => executeWebSearch(params, { serverEnv, dataStream }),
                    }),
                      linkup_search: {
                        description: `Search the web using Linkup. Supports different output types:\n- 'searchResults' (default): Returns raw search results and images.\n- 'sourcedAnswer': Returns a natural language answer with source citations.\n- 'structured': Returns a JSON object conforming to the provided 'structuredOutputSchema'. Requires 'structuredOutputSchema' parameter when used. IMPORTANT: The provided 'structuredOutputSchema' MUST be a valid JSON schema defining an OBJECT at its root. For example: { "type": "object", "properties": { ... } }.`,
                        parameters: linkupSearchSchema,
                        execute: async (params) => executeLinkupSearch(params, { serverEnv, dataStream }),
                      },
                      duckduckgo_search: {
                        description: 'Search the web using DuckDuckGo.',
                        parameters: duckDuckGoSearchSchema,
                        execute: async (params) => executeDuckDuckGoSearch(params, { serverEnv, dataStream }),
                      },
                    stock_chart: tool({
                        description: 'Get stock data and news for given stock symbols.',
                        parameters: stockChartSchema,
                        execute: async (params) => executeStockChart(params, { serverEnv, exa }),
                    }),
                    currency_converter: tool({
                        description: 'Convert currency from one to another using yfinance',
                        parameters: currencyConverterSchema,
                        execute: async (params) => executeCurrencyConverter(params, { serverEnv }),
                    }),
                    x_search: tool({
                        description: 'Search X (formerly Twitter) posts using xAI Live Search.',
                        parameters: xSearchSchema,
                        execute: async (params) => executeXSearch(params, { serverEnv }),
                    }),
                    reddit_search: tool({
                        description: 'Search Reddit content using Tavily API.',
                        parameters: redditSearchSchema,
                        execute: async (params) => executeRedditSearch(params, { serverEnv }),
                    }),
                    text_translate: tool({
                        description: "Translate text from one language to another.",
                        parameters: textTranslateSchema,
                        execute: async (params) => executeTextTranslate(params, { serverEnv, model }),
                    }),
       
                    movie_or_tv_search: tool({
                        description: 'Search specifically for a movie or TV show or Documentary or Anime',
                        parameters: movieOrTvSearchSchema,
                        execute: async (params) => executeMovieOrTvSearch(params, { serverEnv }),
                    }),
                    trending_movies: tool({
                        description: 'Get trending movies from TMDB',
                        parameters: trendingMoviesSchema,
                        execute: async (params) => executeTrendingMovies(params, { serverEnv }),
                    }),
                    trending_tv: tool({
                        description: 'Get trending TV shows from TMDB, NOT MUSIC',
                        parameters: trendingTvSchema,
                        execute: async (params) => executeTrendingTv(params, { serverEnv }),
                    }),
                    academic_search: tool({
                        description: 'Search academic papers and research.',
                        parameters: academicSearchSchema,
                        execute: async (params) => executeAcademicSearch(params, { serverEnv }),
                    }),
                    youtube_search: tool({
                        description: 'Search YouTube videos using Exa AI and get detailed video information.',
                        parameters: youtubeSearchSchema,
                        execute: async (params) => executeYoutubeSearch(params, { serverEnv }),
                    }),
                    retrieve: tool({
                        description: 'Retrieve the full content from a URL using Exa AI, including text, title, summary, images, and more.',
                        parameters: retrieveSchema,
                        execute: async (params) => executeRetrieve(params, { serverEnv }),
                    }),
                    get_weather_data: tool({
                        description: 'Get the weather data for the given location name using geocoding and OpenWeather API.',
                        parameters: weatherSchema,
                        execute: async (params) => executeGetWeatherData(params, { serverEnv }),
                    }),
                    code_interpreter: tool({
                        description: 'Write and execute Python code.',
                        parameters: codeInterpreterSchema,
                        execute: async (params) => executeCodeInterpreter(params, { serverEnv }),
                    }),
                    // Improved geocoding tool - combines forward and reverse geocoding in one tool
                    find_place_on_map: tool({
                        description: 'Find places using OpenStreetMap Nominatim geocoding API. Supports both address-to-coordinates (forward) and coordinates-to-address (reverse) geocoding.',
                        parameters: findPlaceOnMapSchema,
                        execute: async (params) => executeFindPlaceOnMap(params, { serverEnv }),
                    }),
                    
                    // Improved nearby search using Google Places Nearby Search API
                    nearby_places_search: tool({
                        description: 'Search for nearby places using OpenStreetMap Overpass API.',
                        parameters: nearbyPlacesSearchSchema,
                        execute: async (params) => executeNearbyPlacesSearch(params, { serverEnv }),
                    }),
                    track_flight: tool({
                        description: 'Track flight information and status',
                        parameters: trackFlightSchema,
                        execute: async (params) => executeTrackFlight(params, { serverEnv }),
                    }),
                    datetime: tool({
                        description: 'Get the current date and time in the user\'s timezone',
                        parameters: datetimeSchema,
                        execute: async (params) => executeDatetime(params, { timezone }),
                    }),
                    mcp_search: tool({
                        description: 'Search for mcp servers and get the information about them',
                        parameters: mcpSearchSchema,
                        execute: async (params) => executeMcpSearch(params, { serverEnv }),
                    }),
                    memory_manager: tool({
                        description: 'Manage personal memories with add and search operations.',
                        parameters: memoryManagerSchema,
                        execute: async (params) => executeMemoryManager(params, { serverEnv, user }),
                    }),
  
                    extreme_search: extremeSearchTool(dataStream),

                } as ToolSet,
                // tools: toolsToUse as ToolSet,
                experimental_repairToolCall: async ({
                    toolCall,
                    tools,
                    parameterSchema,
                    error,
                }) => {
                    if (NoSuchToolError.isInstance(error)) {
                        return null; // do not attempt to fix invalid tool names
                    }

                    console.log("Fixing tool call================================");
                    console.log("toolCall", toolCall, "tools", tools, "parameterSchema", parameterSchema, "error", error);

                    const tool = tools[toolCall.toolName as keyof typeof tools];

                    const { object: repairedArgs } = await generateObject({
                        model: mind.languageModel("mind-default"),
                        schema: tool.parameters,
                        prompt: [
                            `The model tried to call the tool "${toolCall.toolName}"` +
                            ` with the following arguments:`,
                            JSON.stringify(toolCall.args),
                            `The tool accepts the following schema:`,
                            JSON.stringify(parameterSchema(toolCall)),
                            'Please fix the arguments.',
                            'Do not use print statements stock chart tool.',
                            `For the stock chart tool you have to generate a python code with matplotlib and yfinance to plot the stock chart.`,
                            `For the web search make multiple queries to get the best results.`,
                            `Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                        ].join('\n'),
                    });

                    console.log("repairedArgs", repairedArgs);

                    return { ...toolCall, args: JSON.stringify(repairedArgs) };
                },
                onChunk(event) {
                    if (event.chunk.type === 'tool-call') {
                        console.log('Called Tool: ', event.chunk.toolName);
                    }
                },
                onStepFinish(event) {
                    if (event.warnings) {
                        console.log('Warnings: ', event.warnings);
                    }
                },
                onFinish: async (event) => {
                    // console.log('Fin reason: ', event.finishReason);
                    // console.log('Reasoning: ', event.reasoning);
                    // console.log('reasoning details: ', event.reasoningDetails);
                    // console.log('Steps: ', event.steps);
                    // console.log('Messages: ', event.response.messages);
                    // console.log('Response Body: ', event.response.body);
                    // console.log('Provider metadata: ', event.providerMetadata);
                    // console.log("Sources: ", event.sources);

                    if (user?.id) {
                        try {
                            const assistantId = getTrailingMessageId({
                                messages: event.response.messages.filter(
                                    (message: any) => message.role === 'assistant',
                                ),
                            });

                            if (!assistantId) {
                                throw new Error('No assistant message found!');
                            }

                            const [, assistantMessage] = appendResponseMessages({
                                messages: [messages[messages.length - 1]],
                                responseMessages: event.response.messages,
                            });

                            console.log("Assistant message [annotations]:", assistantMessage.annotations);

                            await saveMessages({
                                messages: [
                                    {
                                        id: assistantId,
                                        chatId: id,
                                        role: assistantMessage.role,
                                        parts: assistantMessage.parts,
                                        attachments:
                                            assistantMessage.experimental_attachments ?? [],
                                        createdAt: new Date(),
                                    },
                                ],
                            });
                        } catch (_) {
                            console.error('Failed to save chat');
                        }
                    }
                },
                onError(event) {
                    console.log('Error: ', event.error);
                },
            });

            result.consumeStream()

            result.mergeIntoDataStream(dataStream, {
                sendReasoning: true
            });
        },
        onError(error) {
            console.log('Error: ', error);
            if (error instanceof Error && error.message.includes('Rate Limit')) {
                return 'Oops, you have reached the rate limit! Please try again later.';
            }
            return 'Oops, an error occurred!';
        },
    })
    const streamContext = getStreamContext();

    if (streamContext) {
        return new Response(
            await streamContext.resumableStream(streamId, () => stream),
        );
    } else {
        return new Response(stream);
    }
}

export async function GET(request: Request) {
    const streamContext = getStreamContext();
    const resumeRequestedAt = new Date();

    if (!streamContext) {
        return new Response(null, { status: 204 });
    }

    const { searchParams } = new URL(request.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) {
        return new ChatSDKError('bad_request:api').toResponse();
    }

    const session = await auth.api.getSession(
        request
    );

    if (!session?.user) {
        return new ChatSDKError('unauthorized:chat').toResponse();
    }

    let chat: Chat | null;

    try {
        chat = await getChatById({ id: chatId });
    } catch {
        return new ChatSDKError('not_found:chat').toResponse();
    }

    if (!chat) {
        return new ChatSDKError('not_found:chat').toResponse();
    }

    if (chat.visibility === 'private' && chat.userId !== session.user.id) {
        return new ChatSDKError('forbidden:chat').toResponse();
    }

    const streamIds = await getStreamIdsByChatId({ chatId });

    if (!streamIds.length) {
        return new ChatSDKError('not_found:stream').toResponse();
    }

    const recentStreamId = streamIds.at(-1);

    if (!recentStreamId) {
        return new ChatSDKError('not_found:stream').toResponse();
    }

    const emptyDataStream = createDataStream({
        execute: () => { },
    });

    const stream = await streamContext.resumableStream(
        recentStreamId,
        () => emptyDataStream,
    );

    /*
     * For when the generation is streaming during SSR
     * but the resumable stream has concluded at this point.
     */
    if (!stream) {
        const messages = await getMessagesByChatId({ id: chatId });
        const mostRecentMessage = messages.at(-1);

        if (!mostRecentMessage) {
            return new Response(emptyDataStream, { status: 200 });
        }

        if (mostRecentMessage.role !== 'assistant') {
            return new Response(emptyDataStream, { status: 200 });
        }

        const messageCreatedAt = new Date(mostRecentMessage.createdAt);

        if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
            return new Response(emptyDataStream, { status: 200 });
        }

        const restoredStream = createDataStream({
            execute: (buffer) => {
                buffer.writeData({
                    type: 'append-message',
                    message: JSON.stringify(mostRecentMessage),
                });
            },
        });

        return new Response(restoredStream, { status: 200 });
    }

    return new Response(stream, { status: 200 });
}