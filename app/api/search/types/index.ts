// lib\types\index.ts
import { CreateMessage, Message, ChatRequestOptions } from 'ai'; // Moved ChatRequestOptions here
import { UIMessage } from '@ai-sdk/ui-utils';
import { SearchGroup, SearchGroupId } from '@/lib/search-groups';

// General Model type (inferred from config/models.ts)
export interface Model {
    id: string;
    name: string;
    provider: string;
    providerId: string;
    enabled: boolean;
    toolCallType: 'native' | 'manual';
    toolCallModel?: string;
    vision?: boolean;
    experimental?: boolean;
    category?: string;
    contextLength?: number;
    supportsFiles?: boolean;
    supportedFileTypes?: string[];
}

// Types from components/ui/form-component.tsx
export interface ModelSwitcherProps {
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    className?: string;
    showExperimentalModels: boolean;
    attachments: Array<Attachment>;
    messages: Array<Message>;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onModelSelect?: (model: any) => void; // Consider defining a specific model type if available
}

export interface Attachment {
    name: string;
    contentType: string;
    url: string;
    size: number;
    dataUrl: string;
}

export interface UploadingAttachment {
    file: File;
    progress: number; // Assuming progress is part of this, based on usage
}

export interface FormComponentProps {
    input: string;
    setInput: (input: string) => void;
    attachments: Array<Attachment>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
    handleSubmit: (
        event?: {
            preventDefault?: () => void;
        },
        chatRequestOptions?: ChatRequestOptions,
    ) => void;
    fileInputRef: React.RefObject<HTMLInputElement>;
    inputRef: React.RefObject<HTMLTextAreaElement>;
    stop: () => void;
    messages: Array<UIMessage>;
    append: (
        message: Message | CreateMessage,
        chatRequestOptions?: ChatRequestOptions,
    ) => Promise<string | null | undefined>;
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    resetSuggestedQuestions?: () => void;
    lastSubmittedQueryRef: React.MutableRefObject<string>;
    selectedGroup: SearchGroupId;
    setSelectedGroup: React.Dispatch<React.SetStateAction<SearchGroupId>>;
    showExperimentalModels: boolean;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    setHasSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    // Editing props
    isEditing?: boolean;
    onCancelEdit?: () => void;
}

export interface GroupSelectorProps {
    selectedGroup: SearchGroupId;
    onGroupSelect: (group: SearchGroup) => void;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onExpandChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ToolbarButtonProps {
    group: SearchGroup;
    isSelected: boolean;
    onClick: () => void;
}

export interface SwitchNotificationProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    isVisible: boolean;
    modelColor?: string;
    notificationType?: 'model' | 'group';
    isThinking?: boolean; // leave this, we're just fixing the UI
}

export interface SelectionContentProps {
    selectedGroup: SearchGroupId;
    onGroupSelect: (group: SearchGroup) => void;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onExpandChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface VideoDetails {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    type?: string;
    provider_name?: string;
    provider_url?: string;
    height?: number;
    width?: number;
}

export interface VideoResult {
    videoId: string;
    url: string;
    details?: VideoDetails;
    captions?: string;
    timestamps?: string[];
    views?: string;
    likes?: string;
    summary?: string;
}

export interface YouTubeSearchResponse {
    results: VideoResult[];
}

export interface YouTubeCardProps {
    video: VideoResult;
    index: number;
}

export interface XResult {
    id: string;
    url: string;
    title: string;
    author?: string;
    publishedDate?: string;
    text: string;
    highlights?: string[];
    tweetId: string;
}

export interface AcademicResult {
    title: string;
    url: string;
    author?: string | null;
    publishedDate?: string;
    summary: string;
}

export {}; // Add an empty export to ensure it's treated as a module
