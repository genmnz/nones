import { 
    wrapLanguageModel, 
    customProvider, 
    extractReasoningMiddleware,
} from "ai";

import { openai } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { groq } from "@ai-sdk/groq";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from '@ai-sdk/google';

const middleware = extractReasoningMiddleware({
    tagName: 'think',
});

export const mind = customProvider({
    languageModels: {
        'mind-default': xai("grok-3-mini"),
        'mind-grok-3': xai('grok-3'),
        'mind-vision': xai('grok-2-vision-1212'),
        'mind-4o': openai.responses('gpt-4o'),
        'mind-o4-mini': openai.responses('o4-mini-2025-04-16'),
        'mind-qwq': wrapLanguageModel({
            model: groq('qwen-qwq-32b'),
            middleware,
        }),
        'mind-google': google('gemini-2.5-flash-preview-05-20'),
        'mind-google-pro': google('gemini-2.5-pro-preview-06-05'),
        'mind-google-flash-2.0': google('models/gemini-2.0-flash'),
        'mind-google-flash-2.0-lite': google('models/gemini-2.0-flash-lite'),
        'mind-google-flash-2.0-001': google('models/gemini-2.0-flash-001'),
        'mind-anthropic': anthropic('claude-sonnet-4-20250514'),
        'mind-anthropic-thinking': anthropic('claude-sonnet-4-20250514'),
        'mind-llama-4': groq('meta-llama/llama-4-maverick-17b-128e-instruct', {
            parallelToolCalls: false,
        }),
        'mind-raycast': xai("grok-3-beta"),
    }
})
