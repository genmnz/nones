import { wrapLanguageModel, customProvider, extractReasoningMiddleware } from "ai";
import { openai, OpenAIResponsesProviderOptions } from "@ai-sdk/openai";
import { xai } from "@ai-sdk/xai";
import { groq } from "@ai-sdk/groq";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from '@ai-sdk/google';
import { perplexity } from "@ai-sdk/perplexity";
import {GoogleGenAI} from '@google/genai';
// import wav from 'wav';


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
        'mind-transcribe': google('models/gemini-2.0-flash-lite-tts'),
        'mind-gemini-embedding-exp-03-07': google('models/gemini-embedding-exp-03-07'),
        'mind-gemini-exp-1206': google('models/gemini-exp-1206'),
        'mind-gemini-pro-vision': google('models/gemini-pro-vision'),
        'mind-gemma-3-12b-it': google('models/gemma-3-12b-it'),
        'mind-gemma-3-1b-it': google('models/gemma-3-1b-it'),
        'mind-gemma-3-27b-it': google('models/gemma-3-27b-it'),
        'mind-gemma-3-4b-it': google('models/gemma-3-4b-it'),
        'mind-gemma-3n-e4b-it': google('models/gemma-3n-e4b-it'),
        'mind-learnlm-2.0-flash-experimental': google('models/learnlm-2.0-flash-experimental'),
        'mind-text-embedding-004': google('models/text-embedding-004'),
        'mind-perplexity': perplexity('sonar-pro'),
    }
})

export const providerOptions = (model: string, group: string) => ({
    google: {
        ...(model.includes('thinking') ? {
            thinkingConfig: {
                includeThoughts: true,
                thinkingBudget: 1000,   
            },
        } : {}),
    },
    openai: {
        ...(model === 'mind-o4-mini' ? {
            reasoningEffort: 'low',
            strictSchemas: true,
        } : {}),
        ...(model === 'mind-4o' ? {
            parallelToolCalls: false,
            strictSchemas: true,
        } : {}),
    } as OpenAIResponsesProviderOptions,
    xai: {
        ...(group === "chat" ? {
            search_parameters: {
                mode: "auto",
                return_citations: true
            }
        } : {}),
        ...(model === 'mind-default' ? {
            reasoningEffort: 'low',
        } : {}),
    },
    anthropic: {
        ...(model === 'mind-anthropic-thinking' || model === 'mind-anthropic-pro-thinking' ? {
            thinking: { type: 'enabled', budgetTokens: 12000 },
        } : {}),
    },
    perplexity: {
        ...(model === 'mind-perplexity' ? {
            search_parameters: {
                mode: "auto",
                return_citations: true,
                sources: true,
            }
        } : {}),
    }
})