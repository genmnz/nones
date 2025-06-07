import { AnthropicIcon, XAIIcon } from "@/public/icons/providers";
import { GeminiIcon, GroqIcon, OpenAIIcon, QwenIcon } from "@/public/icons/providers";

interface Model {
    value: string;
    label: string;
    iconClass?: string;
    description: string;
    color?: string;
    vision: boolean;
    reasoning: boolean;
    pdf: boolean;
    icon: string | React.FunctionComponent<React.SVGProps<SVGSVGElement>>; // DO NOT Change icon type to string

    category: string;
    experimental: boolean;
    thinking: boolean;
}

  

export const models = [
    { value: "mind-default", label: "Grok 3.0 Mini", icon: XAIIcon, iconClass: "text-current", description: "xAI's most efficient reasoning model", color: "black", vision: false, reasoning: true, experimental: false, category: "Stable", pdf: false },
    { value: "mind-grok-3", label: "Grok 3.0", icon: XAIIcon, iconClass: "text-current", description: "xAI's most intelligent model", color: "gray", vision: false, reasoning: false, experimental: false, category: "Stable", pdf: false },
    { value: "mind-vision", label: "Grok 2.0 Vision", icon: XAIIcon, iconClass: "text-current", description: "xAI's advanced vision model", color: "indigo", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: false },
    { value: "mind-anthropic", label: "Claude 4 Sonnet", icon: AnthropicIcon, iconClass: "text-current", description: "Anthropic's most advanced model", color: "violet", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: true },
    { value: "mind-anthropic-thinking", label: "Claude 4 Sonnet Thinking", icon: AnthropicIcon, iconClass: "text-current", description: "Anthropic's most advanced reasoning model", color: "violet", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "mind-google", label: "Gemini 2.5 Flash (Thinking)", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced small reasoning model", color: "gemini", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "mind-google-flash-2.0", label: "Gemini 2.0 Flash", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced small reasoning model", color: "gemini", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: true },
    { value: "mind-google-flash-2.0-lite", label: "Gemini 2.0 Flash Lite", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced small reasoning model", color: "gemini", vision: false, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "mind-google-flash-2.0-001", label: "Gemini 2.0 Flash 001", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced small reasoning model", color: "gemini", vision: false, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "mind-google-pro", label: "Gemini 2.5 Pro (Preview)", icon: GeminiIcon, iconClass: "text-current", description: "Google's advanced reasoning model", color: "gemini", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
    { value: "mind-4o", label: "GPT 4o", icon: OpenAIIcon, iconClass: "text-current", description: "OpenAI's flagship model", color: "blue", vision: true, reasoning: false, experimental: false, category: "Stable", pdf: true },
    { value: "mind-o4-mini", label: "o4 mini", icon: OpenAIIcon, iconClass: "text-current", description: "OpenAI's faster mini reasoning model", color: "blue", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: false },
    { value: "mind-llama-4", label: "Llama 4 Maverick", icon: GroqIcon, iconClass: "text-current", description: "Meta's latest model", color: "blue", vision: true, reasoning: false, experimental: true, category: "Experimental", pdf: false },
    { value: "mind-qwq", label: "QWQ 32B", icon: QwenIcon, iconClass: "text-current", description: "Alibaba's advanced reasoning model", color: "purple", vision: false, reasoning: true, experimental: true, category: "Experimental", pdf: false },
    { value: "mind-perplexity", label: "Perplexity Sonar Pro", icon: XAIIcon, iconClass: "text-current", description: "Perplexity's advanced reasoning model", color: "purple", vision: true, reasoning: true, experimental: false, category: "Stable", pdf: true },
];
