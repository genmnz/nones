import { z } from 'zod';
import { generateObject } from 'ai';
import { mind } from '@/ai/providers';

export const textTranslateSchema = z.object({
  text: z.string().describe("The text to translate."),
  to: z.string().describe("The language to translate to (e.g., French)."),
});

export type TextTranslateParams = z.infer<typeof textTranslateSchema>;

type textTranslateContext = {
  model: string;
  serverEnv: { ELEVENLABS_API_KEY?: string };
};

export async function executeTextTranslate(
  { text, to }: TextTranslateParams,
  context: textTranslateContext,
) {
  const { model, serverEnv } = context;
  // const elevenLabs = new ElevenLabs(serverEnv.ELEVENLABS_API_KEY);
  const { object: translation } = await generateObject({
    model: mind.languageModel(model),
    system: `You are a helpful assistant that translates text from one language to another.`,
    prompt: `Translate the following text to ${to} language: ${text}`,
    schema: z.object({
      translatedText: z.string(),
      detectedLanguage: z.string(),
    }),
  });
  console.log(translation);
  return {
    translatedText: translation.translatedText,
    detectedLanguage: translation.detectedLanguage,
  };
}
