/* eslint-disable @next/next/no-img-element */
// /components/ui/form-component.tsx
import React, { useState, useRef, useCallback, useEffect,
    unstable_ViewTransition as ViewTransition } from "react"
import { motion, AnimatePresence } from 'motion/react';
import { ChatRequestOptions, CreateMessage, Message } from 'ai';
import { toast } from 'sonner';
import useWindowSize from '@/hooks/use-window-size';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BrainCircuit, EyeIcon, Globe, Upload, TelescopeIcon, X } from 'lucide-react';
import { cn, getColorClasses } from '@/lib/utils';
import { SearchGroup, SearchGroupId, searchGroups } from '@/lib/search-groups';
import { UIMessage } from '@ai-sdk/ui-utils';
import { track } from '@vercel/analytics';
import { useSession } from '@/lib/auth-client';
import { User } from '@/lib/db/schema';
import { checkImageModeration } from '@/app/actions';
import { ArrowUpIcon, StopIcon, PaperclipIcon } from '@/public/icons/form';

import { models } from '@/ai/models';

interface ModelSwitcherProps {
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    className?: string;
    showExperimentalModels: boolean;
    attachments: Array<Attachment>;
    messages: Array<Message>;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onModelSelect?: (model: typeof models[0]) => void;
}



const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ selectedModel, setSelectedModel, className, showExperimentalModels, attachments, messages, status, onModelSelect }) => {
    const selectedModelData = models.find(model => model.value === selectedModel);
    const [isOpen, setIsOpen] = useState(false);
    const isProcessing = status === 'submitted' || status === 'streaming';

    // Check for attachments in current and previous messages
    const hasAttachments = attachments.length > 0 || messages.some(msg =>
        msg.experimental_attachments && msg.experimental_attachments.length > 0
    );

    // Filter models based on attachments first
    // Always show experimental models by removing the experimental filter
    const filteredModels = hasAttachments
        ? models.filter(model => model.vision)
        : models;

    // Group filtered models by category
    const groupedModels = filteredModels.reduce((acc, model) => {
        const category = model.category;
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(model);
        return acc;
    }, {} as Record<string, typeof models>);

    // Get hover color classes based on model color
    const getHoverColorClasses = (modelColor: string) => {
        switch (modelColor) {
            case 'black': return 'hover:bg-black/20! dark:hover:bg-black/20!';
            case 'gray': return 'hover:bg-gray-500/20! dark:hover:bg-gray-400/20!';
            case 'indigo': return 'hover:bg-indigo-500/20! dark:hover:bg-indigo-400/20!';
            case 'violet': return 'hover:bg-violet-500/20! dark:hover:bg-violet-400/20!';
            case 'purple': return 'hover:bg-purple-500/20! dark:hover:bg-purple-400/20!';
            case 'gemini': return 'hover:bg-teal-500/20! dark:hover:bg-teal-400/20!';
            case 'blue': return 'hover:bg-blue-500/20! dark:hover:bg-blue-400/20!';
            case 'vercel-gray': return 'hover:bg-zinc-500/20! dark:hover:bg-zinc-400/20!';
            default: return 'hover:bg-neutral-500/20! dark:hover:bg-neutral-400/20!';
        }
    };

    // Update getCapabilityColors to handle PDF capability
    const getCapabilityColors = (capability: string) => {
        if (capability === 'reasoning') {
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700";
        } else if (capability === 'vision') {
            return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700";
        } else if (capability === 'pdf') {
            return "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800/50";
        }
        return "";
    };

    return (
        <DropdownMenu
            onOpenChange={setIsOpen}
            modal={false}
            open={isOpen && !isProcessing}
        >
            <DropdownMenuTrigger
                className={cn(
                    "flex items-center gap-2 p-2 sm:px-3 h-8",
                    "rounded-full transition-all duration-200",
                    "border border-neutral-200 dark:border-neutral-800",
                    "hover:shadow-sm hover:border-neutral-300 dark:hover:border-neutral-700",
                    getColorClasses(selectedModelData?.color || "neutral", true),
                    isProcessing && "opacity-50 pointer-events-none",
                    "ring-0 outline-hidden",
                    "group",
                    className
                )}
                disabled={isProcessing}
            >
                <div className="relative flex items-center gap-2">
                    {selectedModelData && (
                        typeof selectedModelData.icon === 'string' ? (
                            <img
                                src={selectedModelData.icon}
                                alt={selectedModelData.label}
                                className={cn(
                                    "w-3.5 h-3.5 object-contain transition-all duration-300",
                                    "group-hover:scale-110 group-hover:rotate-6",
                                    selectedModelData.iconClass
                                )}
                            />
                        ) : (
                            <selectedModelData.icon
                                className={cn(
                                    "w-3.5 h-3.5 transition-all duration-300",
                                    "group-hover:scale-110 group-hover:rotate-6",
                                    selectedModelData.iconClass
                                )}
                            />
                        )
                    )}
                    <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium overflow-hidden">
                        <motion.div
                            variants={{
                                initial: { opacity: 0, y: 10 },
                                animate: { opacity: 1, y: 0 },
                                exit: { opacity: 0, y: -10 }
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                                mass: 0.5
                            }}
                            className="whitespace-nowrap"
                        >
                            {selectedModelData?.label || ""}
                        </motion.div>
                        <motion.div
                            animate={{
                                rotate: isOpen ? 180 : 0
                            }}
                            transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30
                            }}
                            className="opacity-60"
                        >
                            <svg
                                width="8"
                                height="5"
                                viewBox="0 0 9 6"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M1 1L4.5 4.5L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </motion.div>
                    </span>
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="w-[260px]! p-1! font-sans! rounded-lg bg-white dark:bg-neutral-900 mt-2! z-52! shadow-lg border border-neutral-200 dark:border-neutral-800 max-h-[300px]! overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent"
                align="start"
                side="bottom"
                avoidCollisions={['submitted', 'streaming', 'ready', 'error'].includes(status)}
                sideOffset={6}
                forceMount
            >
                {Object.entries(groupedModels).map(([category, categoryModels], categoryIndex) => (
                    <div key={category} className={cn("pt-0.5 pb-0.5", categoryIndex > 0 ? "mt-0.5 border-t border-neutral-200 dark:border-neutral-800" : "")}>
                        <div className="px-1.5 py-0.5 text-xs! sm:text-[9px] font-medium text-neutral-500 dark:text-neutral-400">
                            {category} Models
                        </div>
                        <div className="space-y-0.5">
                            {categoryModels.map((model) => (
                                <DropdownMenuItem
                                    key={model.value}
                                    onSelect={() => {
                                        console.log("Selected model:", model.value);
                                        setSelectedModel(model.value.trim());

                                        // Call onModelSelect if provided
                                        if (onModelSelect) {
                                            // Show additional info about image attachments for vision models
                                            onModelSelect(model);
                                        }
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-1.5 py-1.5 rounded-md text-xs",
                                        "transition-all duration-200",
                                        "group/item",
                                        selectedModel === model.value
                                            ? getColorClasses(model.color, true)
                                            : getHoverColorClasses(model.color)
                                    )}
                                >
                                    <div className={cn(
                                        "flex items-center justify-center size-7 rounded-md",
                                        "transition-all duration-300",
                                        "group-hover/item:scale-110 group-hover/item:rotate-6",
                                        selectedModel === model.value
                                            ? "bg-white/20 dark:bg-white/10"
                                            : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                                    )}>
                                        {typeof model.icon === 'string' ? (
                                            <img
                                                src={model.icon}
                                                alt={model.label}
                                                className={cn(
                                                    "w-4 h-4 object-contain",
                                                    "transition-all duration-300",
                                                    "group-hover/item:scale-110 group-hover/item:rotate-12",
                                                    model.iconClass,
                                                    model.value === "mind-optimus" && "invert"
                                                )}
                                            />
                                        ) : (
                                            <model.icon
                                                className={cn(
                                                    "size-4",
                                                    "transition-all duration-300",
                                                    "group-hover/item:scale-110 group-hover/item:rotate-12",
                                                    model.iconClass
                                                )}
                                            />
                                        )}
                                    </div>
                                    <div className="flex flex-col gap-0 min-w-0 flex-1">
                                        <div className="font-medium truncate text-[11px] flex items-center">
                                            {model.label}
                                        </div>
                                        <div className="text-[9px] opacity-70 truncate leading-tight">
                                            {model.description}
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            {(model.vision || model.reasoning || model.pdf) && (
                                                <div className="flex gap-1">
                                                    {model.vision && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                                                            getCapabilityColors("vision")
                                                        )}>
                                                            <EyeIcon className="size-2.5" />
                                                            <span>Vision</span>
                                                        </div>
                                                    )}
                                                    {model.reasoning && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                                                            getCapabilityColors("reasoning")
                                                        )}>
                                                            <BrainCircuit className="size-2.5" />
                                                            <span>Reasoning</span>
                                                        </div>
                                                    )}
                                                    {model.pdf && (
                                                        <div className={cn(
                                                            "flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium",
                                                            getCapabilityColors("pdf")
                                                        )}>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="size-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                            </svg>
                                                            <span>PDF</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </div>
                    </div>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface Attachment {
    name: string;
    contentType: string;
    url: string;
    size: number;
}


const MAX_FILES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
const MAX_INPUT_CHARS = 10000;

// Helper function to convert File to base64 data URL for moderation
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Add this helper function near the top with other utility functions
const supportsPdfAttachments = (modelValue: string): boolean => {
    const selectedModel = models.find(model => model.value === modelValue);
    return selectedModel?.pdf === true;
};

// Update the hasVisionSupport function to check for PDF support
const hasVisionSupport = (modelValue: string): boolean => {
    const selectedModel = models.find(model => model.value === modelValue);
    return selectedModel?.vision === true;
};

// Update the getAcceptFileTypes function to use pdf property
const getAcceptFileTypes = (modelValue: string): string => {
    const selectedModel = models.find(model => model.value === modelValue);
    if (selectedModel?.pdf) {
        return "image/*,.pdf";
    }
    return "image/*";
};

const truncateFilename = (filename: string, maxLength: number = 20) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split('.').pop();
    const name = filename.substring(0, maxLength - 4);
    return `${name}...${extension}`;
};

const AttachmentPreview: React.FC<{ attachment: Attachment | UploadingAttachment, onRemove: () => void, isUploading: boolean }> = ({ attachment, onRemove, isUploading }) => {
    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB' +
            (bytes > MAX_FILE_SIZE ? ' (exceeds 5MB limit)' : '');
    };

    const isUploadingAttachment = (attachment: Attachment | UploadingAttachment): attachment is UploadingAttachment => {
        return 'progress' in attachment;
    };

    const isPdf = (attachment: Attachment | UploadingAttachment): boolean => {
        if (isUploadingAttachment(attachment)) {
            return attachment.file.type === 'application/pdf';
        }
        return (attachment as Attachment).contentType === 'application/pdf';
    };

    return (
        <ViewTransition
            name="home"
            enter="page-enter"
            exit="page-exit duration-400"
    >
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className={cn(
                "relative flex items-center shrink-0 z-0",
                "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs",
                "border border-neutral-200/80 dark:border-neutral-700/80",
                "rounded-2xl p-2 pr-8 gap-2.5",
                "shadow-xs hover:shadow-md",
                "hover:bg-white dark:hover:bg-neutral-800",
                "transition-all duration-200 group"
            )}
        >
            {isUploading ? (
                <div className="w-8 h-8 flex items-center justify-center">
                    <svg className="animate-spin h-4 w-4 text-neutral-500 dark:text-neutral-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            ) : isUploadingAttachment(attachment) ? (
                <div className="w-8 h-8 flex items-center justify-center">
                    <div className="relative w-6 h-6">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                                className="text-neutral-200 dark:text-neutral-700 stroke-current"
                                strokeWidth="8"
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                            ></circle>
                            <circle
                                className="text-primary stroke-current"
                                strokeWidth="8"
                                strokeLinecap="round"
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                strokeDasharray={`${attachment.progress * 251.2}, 251.2`}
                                transform="rotate(-90 50 50)"
                            ></circle>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">{Math.round(attachment.progress * 100)}%</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-900 shrink-0 ring-1 ring-neutral-200/50 dark:ring-neutral-700/50 flex items-center justify-center">
                    {isPdf(attachment) ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 dark:text-red-400">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <path d="M9 15v-2h6v2"></path>
                            <path d="M12 18v-5"></path>
                        </svg>
                    ) : (
                        <img
                            src={(attachment as Attachment).url}
                            alt={`Preview of ${attachment.name}`}
                            className="h-full w-full object-cover"
                        />
                    )}
                </div>
            )}
            <div className="grow min-w-0">
                {!isUploadingAttachment(attachment) && (
                    <p className="text-xs font-medium truncate text-neutral-800 dark:text-neutral-200">
                        {truncateFilename(attachment.name)}
                    </p>
                )}
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    {isUploadingAttachment(attachment)
                        ? 'Uploading...'
                        : formatFileSize((attachment as Attachment).size)}
                </p>
            </div>
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className={cn(
                    "absolute -top-1.5 -right-1.5 p-0.5 m-0 rounded-full",
                    "bg-white/90 dark:bg-neutral-800/90 backdrop-blur-xs",
                    "border border-neutral-200/80 dark:border-neutral-700/80",
                    "shadow-xs hover:shadow-md",
                    "transition-all duration-200 z-20",
                    "opacity-0 group-hover:opacity-100",
                    "scale-75 group-hover:scale-100",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-700"
                )}
            >
                <X className="h-3 w-3 text-neutral-500 dark:text-neutral-400" />
            </motion.button>
        </motion.div>
        </ViewTransition>
    );
};

interface UploadingAttachment {
    file: File;
    progress: number;
}

interface FormComponentProps {
    input: string;
    setInput: (input: string) => void;
    attachments: Array<Attachment>;
    setAttachments: React.Dispatch<React.SetStateAction<Array<Attachment>>>;
    chatId: string;
    user: User | null;
    handleSubmit: (
        event?: {
            preventDefault?: () => void;
        },
        chatRequestOptions?: ChatRequestOptions,
    ) => void;
    fileInputRef?: React.RefObject<HTMLInputElement | null>;
    inputRef?: React.RefObject<HTMLTextAreaElement | null>;
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
}

interface GroupSelectorProps {
    selectedGroup: SearchGroupId;
    onGroupSelect: (group: SearchGroup) => void;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onExpandChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

interface ToolbarButtonProps {
    group: SearchGroup;
    isSelected: boolean;
    onClick: () => void;
}

interface SwitchNotificationProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    isVisible: boolean;
    modelColor?: string;
    notificationType?: 'model' | 'group';
}

const SwitchNotification: React.FC<SwitchNotificationProps> = ({
    icon,
    title,
    description,
    isVisible,
    modelColor = 'default',
    notificationType = 'model'
}) => {
    // Icon color is always white for better contrast on colored backgrounds
    const getIconColorClass = () => "text-white";

    // Get background color for model notifications only
    const getModelBgClass = (color: string) => {
        switch (color) {
            case 'black':
                return 'bg-[#0F0F0F] dark:bg-[#0F0F0F] border-[#0F0F0F] dark:border-[#0F0F0F]';
            case 'gray':
                return 'bg-[#4E4E4E] dark:bg-[#4E4E4E] border-[#4E4E4E] dark:border-[#4E4E4E]';
            case 'indigo':
                return 'bg-[#4F46E5] dark:bg-[#4F46E5] border-[#4F46E5] dark:border-[#4F46E5]';
            case 'violet':
                return 'bg-[#8B5CF6] dark:bg-[#8B5CF6] border-[#8B5CF6] dark:border-[#8B5CF6]';
            case 'purple':
                return 'bg-[#5E5ADB] dark:bg-[#5E5ADB] border-[#5E5ADB] dark:border-[#5E5ADB]';
            case 'gemini':
                return 'bg-[#1EA896] dark:bg-[#1EA896] border-[#1EA896] dark:border-[#1EA896]';
            case 'blue':
                return 'bg-[#1C7DFF] dark:bg-[#1C7DFF] border-[#1C7DFF] dark:border-[#1C7DFF]';
            case 'vercel-gray':
                return 'bg-[#27272A] dark:bg-[#27272A] border-[#27272A] dark:border-[#27272A]';
            default:
                return 'bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700';
        }
    };

    // For model notifications, use model colors. For group notifications, use default background.
    const useModelColor = notificationType === 'model' && modelColor !== 'default';
    const bgColorClass = useModelColor
        ? getModelBgClass(modelColor)
        : "bg-neutral-100 dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{
                        opacity: { duration: 0.2 },
                        height: { duration: 0.2 }
                    }}
                    className={cn(
                        "w-[97%] max-w-2xl overflow-hidden mx-auto z-0",
                        "text-sm text-neutral-700 dark:text-neutral-300 -mb-[0.499px]"
                    )}
                >
                    <div className={cn(
                        "flex items-center gap-2 p-2 py-1 sm:p-2.5 sm:py-2 rounded-t-lg border border-b-0 shadow-xs backdrop-blur-xs",
                        bgColorClass,
                        useModelColor ? "text-white" : "text-neutral-900 dark:text-neutral-100"
                    )}>
                        {icon && (
                            <span className={cn(
                                "shrink-0 size-3.5 sm:size-4",
                                useModelColor ? getIconColorClass() : "text-primary",
                            )}>
                                {icon}
                            </span>
                        )}
                        <div className="flex flex-col items-start sm:flex-row sm:items-center sm:flex-wrap gap-x-1.5 gap-y-0.5">
                            <span className={cn(
                                "font-semibold text-xs sm:text-sm",
                                useModelColor ? "text-white" : "text-neutral-900 dark:text-neutral-100"
                            )}>
                                {title}
                            </span>
                            <span className={cn(
                                "text-[10px] sm:text-xs leading-tight",
                                useModelColor ? "text-white/80" : "text-neutral-600 dark:text-neutral-400"
                            )}>
                                {description}
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const ToolbarButton = ({ group, isSelected, onClick }: ToolbarButtonProps) => {
    const Icon = group.icon;
    const { width } = useWindowSize();
    const isMobile = width ? width < 768 : false;

    const commonClassNames = cn(
        "relative flex items-center justify-center",
        "size-8",
        "rounded-full",
        "transition-colors duration-300",
        isSelected
            ? "bg-neutral-500 dark:bg-neutral-600 text-white dark:text-neutral-300"
            : "text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80"
    );

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    };

    // Use regular button for mobile without tooltip
    if (isMobile) {
        return (
            <button
                onClick={handleClick}
                className={commonClassNames}
                style={{ WebkitTapHighlightColor: 'transparent' }}
            >
                <Icon className="size-4" />
            </button>
        );
    }

    // With tooltip for desktop
    return (
        <Tooltip delayDuration={100}>
            <TooltipTrigger asChild>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleClick}
                    className={commonClassNames}
                >
                    <Icon className="size-4" />
                </motion.button>
            </TooltipTrigger>
            <TooltipContent
                side="bottom"
                sideOffset={6}
                className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3 max-w-[200px]"
            >
                <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-[11px]">{group.name}</span>
                    <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">{group.description}</span>
                </div>
            </TooltipContent>
        </Tooltip>
    );
};

interface SelectionContentProps {
    selectedGroup: SearchGroupId;
    onGroupSelect: (group: SearchGroup) => void;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onExpandChange?: React.Dispatch<React.SetStateAction<boolean>>;
}

const SelectionContent = ({ selectedGroup, onGroupSelect, status, onExpandChange }: SelectionContentProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const isProcessing = status === 'submitted' || status === 'streaming';
    const { width } = useWindowSize();
    const isMobile = width ? width < 768 : false;
    const { data: session } = useSession();

    // Notify parent component when expansion state changes
    useEffect(() => {
        if (onExpandChange) {
            // Only notify about expansion on mobile devices
            onExpandChange(isMobile ? isExpanded : false);
        }
    }, [isExpanded, onExpandChange, isMobile]);

    // If user is not authenticated and selectedGroup is memory, switch to web
    useEffect(() => {
        if (!session && (selectedGroup === 'memory')) {
            // Find a group object with id 'web'
            const webGroup = searchGroups.find(group => group.id === 'web');
            if (webGroup) {
                onGroupSelect(webGroup);
            }
        }
    }, [session, selectedGroup, onGroupSelect]);

    // Filter groups based on authentication status
    const visibleGroups = searchGroups.filter(group => {
        // Only show groups that are marked as visible
        if (!group.show) return false;

        // If the group requires authentication and user is not authenticated, hide it
        if ('requireAuth' in group && group.requireAuth && !session) return false;

        return true;
    });

    return (
        <motion.div
            layout={false}
            initial={false}
            animate={{
                width: isExpanded && !isProcessing ? "auto" : "30px",
                gap: isExpanded && !isProcessing ? "0.5rem" : 0,
                paddingRight: isExpanded && !isProcessing ? "0.4rem" : 0,
            }}
            transition={{
                duration: 0.2,
                ease: "easeInOut",
            }}
            className={cn(
                "inline-flex items-center min-w-[38px] p-0.5",
                "rounded-full border border-neutral-200 dark:border-neutral-800",
                "bg-white dark:bg-neutral-900 shadow-xs overflow-visible",
                "relative z-10",
                isProcessing && "opacity-50 pointer-events-none"
            )}
            onMouseEnter={() => !isProcessing && setIsExpanded(true)}
            onMouseLeave={() => !isProcessing && setIsExpanded(false)}
        >
            <TooltipProvider>
                <AnimatePresence initial={false}>
                    {visibleGroups.map((group, index, filteredGroups) => {
                        const showItem = (isExpanded && !isProcessing) || selectedGroup === group.id;
                        const isLastItem = index === filteredGroups.length - 1;
                        return (
                            <motion.div
                                key={group.id}
                                layout={false}
                                animate={{
                                    width: showItem ? "28px" : 0,
                                    opacity: showItem ? 1 : 0,
                                    marginRight: (showItem && isLastItem && isExpanded) ? "2px" : 0
                                }}
                                transition={{
                                    duration: 0.15,
                                    ease: "easeInOut"
                                }}
                                className={cn(
                                    "m-0!",
                                    isLastItem && isExpanded && showItem ? "pr-0.5" : ""
                                )}
                            >
                                <ToolbarButton
                                    group={group}
                                    isSelected={selectedGroup === group.id}
                                    onClick={() => !isProcessing && onGroupSelect(group)}
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </TooltipProvider>
        </motion.div>
    );
};

const GroupSelector = ({ selectedGroup, onGroupSelect, status, onExpandChange }: GroupSelectorProps) => {
    return (
        <SelectionContent
            selectedGroup={selectedGroup}
            onGroupSelect={onGroupSelect}
            status={status}
            onExpandChange={onExpandChange}
        />
    );
};

const FormComponent: React.FC<FormComponentProps> = ({
    chatId,
    user,
    input,
    setInput,
    attachments,
    setAttachments,
    handleSubmit,
    fileInputRef,
    inputRef,
    stop,
    selectedModel,
    setSelectedModel,
    resetSuggestedQuestions,
    lastSubmittedQueryRef,
    selectedGroup,
    setSelectedGroup,
    showExperimentalModels,
    messages,
    status,
    setHasSubmitted,
}) => {
    const [uploadQueue, setUploadQueue] = useState<Array<string>>([]);
    const isMounted = useRef(true);
    const isCompositionActive = useRef(false)
    const { width } = useWindowSize();
    const postSubmitFileInputRef = useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const [isGroupSelectorExpanded, setIsGroupSelectorExpanded] = useState(false);
    const [switchNotification, setSwitchNotification] = useState<{
        show: boolean;
        icon: React.ReactNode;
        title: string;
        description: string;
        notificationType?: 'model' | 'group';
        visibilityTimeout?: NodeJS.Timeout;
    }>({
        show: false,
        icon: null,
        title: '',
        description: '',
        notificationType: 'model',
        visibilityTimeout: undefined
    });

    const showSwitchNotification = (title: string, description: string, icon?: React.ReactNode, color?: string, type: 'model' | 'group' = 'model') => {
        // Clear any existing timeout to prevent conflicts
        if (switchNotification.visibilityTimeout) {
            clearTimeout(switchNotification.visibilityTimeout);
        }

        setSwitchNotification({
            show: true,
            icon: icon || null,
            title,
            description,
            notificationType: type,
            visibilityTimeout: undefined
        });

        // Auto hide after 3 seconds
        const timeout = setTimeout(() => {
            setSwitchNotification(prev => ({ ...prev, show: false }));
        }, 3000);

        // Update the timeout reference
        setSwitchNotification(prev => ({ ...prev, visibilityTimeout: timeout }));
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (switchNotification.visibilityTimeout) {
                clearTimeout(switchNotification.visibilityTimeout);
            }
        };
    }, [switchNotification.visibilityTimeout]);

    const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        event.preventDefault();
        const newValue = event.target.value;

        // Check if input exceeds character limit
        if (newValue.length > MAX_INPUT_CHARS) {
            setInput(newValue);
            toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters.`);
        } else {
            setInput(newValue);
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
    };

    const handleBlur = () => {
        setIsFocused(false);
    };

    const handleGroupSelect = useCallback((group: SearchGroup) => {
        setSelectedGroup(group.id);
        inputRef?.current?.focus();

        showSwitchNotification(
            group.name,
            group.description,
            <group.icon className="size-4" />,
            group.id, // Use the group ID directly as the color code
            'group'   // Specify this is a group notification
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setSelectedGroup, inputRef]);

    // Update uploadFile function to add more error details
    const uploadFile = async (file: File): Promise<Attachment> => {
        const formData = new FormData();
        formData.append('file', file);

        try {
            console.log("Uploading file:", file.name, file.type, file.size);
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Upload successful:", data);
                return data;
            } else {
                const errorText = await response.text();
                console.error("Upload failed with status:", response.status, errorText);
                throw new Error(`Failed to upload file: ${response.status} ${errorText}`);
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            throw error;
        }
    };

    // Fix handleFileChange to ensure it properly processes files
    const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files || []);
        if (files.length === 0) {
            console.log("No files selected in file input");
            return;
        }

        console.log("Files selected:", files.map(f => `${f.name} (${f.type})`));

        // First, separate images and PDFs
        const imageFiles: File[] = [];
        const pdfFiles: File[] = [];
        const unsupportedFiles: File[] = [];
        const oversizedFiles: File[] = [];

        files.forEach(file => {
            // Check file size first
            if (file.size > MAX_FILE_SIZE) {
                oversizedFiles.push(file);
                return;
            }

            // Then check file type
            if (file.type.startsWith('image/')) {
                imageFiles.push(file);
            } else if (file.type === 'application/pdf') {
                pdfFiles.push(file);
            } else {
                unsupportedFiles.push(file);
            }
        });

        if (unsupportedFiles.length > 0) {
            console.log("Unsupported files:", unsupportedFiles.map(f => `${f.name} (${f.type})`));
            toast.error(`Some files are not supported: ${unsupportedFiles.map(f => f.name).join(', ')}`);
        }

        if (imageFiles.length === 0 && pdfFiles.length === 0) {
            console.log("No supported files found");
            event.target.value = '';
            return;
        }

        // Auto-switch to PDF-compatible model if PDFs are present
        const currentModelData = models.find(m => m.value === selectedModel);
        if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
            console.log("PDFs detected, switching to compatible model");

            // Find first compatible model that supports PDFs and vision
            const compatibleModel = models.find(m => m.pdf && m.vision);

            if (compatibleModel) {
                console.log("Switching to compatible model:", compatibleModel.value);
                setSelectedModel(compatibleModel.value);
                showSwitchNotification(
                    compatibleModel.label,
                    'Switched to a model that supports PDF documents',
                    typeof compatibleModel.icon === 'string' ?
                        <img src={compatibleModel.icon} alt={compatibleModel.label} className="size-4 object-contain" /> :
                        <compatibleModel.icon className="size-4" />,
                    compatibleModel.color,
                    'model'
                );
            } else {
                console.warn("No PDF-compatible model found");
                toast.error("PDFs are only supported by Gemini and Claude models");
                // Continue with only image files
                if (imageFiles.length === 0) {
                    event.target.value = '';
                    return;
                }
            }
        }

        // Combine valid files
        let validFiles: File[] = [...imageFiles];
        if (supportsPdfAttachments(selectedModel) || pdfFiles.length > 0) {
            validFiles = [...validFiles, ...pdfFiles];
        }

        console.log("Valid files for upload:", validFiles.map(f => f.name));

        const totalAttachments = attachments.length + validFiles.length;
        if (totalAttachments > MAX_FILES) {
            toast.error(`You can only attach up to ${MAX_FILES} files.`);
            event.target.value = '';
            return;
        }

        if (validFiles.length === 0) {
            console.error("No valid files to upload");
            event.target.value = '';
            return;
        }

        // Check image moderation before uploading
        if (imageFiles.length > 0) {
            try {
                console.log("Checking image moderation for", imageFiles.length, "images");
                toast.info("Checking images for safety...");

                // Convert images to data URLs for moderation
                const imageDataURLs = await Promise.all(
                    imageFiles.map(file => fileToDataURL(file))
                );

                // Check moderation
                const moderationResult = await checkImageModeration(imageDataURLs);
                console.log("Moderation result:", moderationResult);

                if (moderationResult !== 'safe') {
                    const [status, category] = moderationResult.split('\n');
                    if (status === 'unsafe') {
                        console.warn("Unsafe image detected, category:", category);
                        toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
                        event.target.value = '';
                        return;
                    }
                }

                console.log("Images passed moderation check");
            } catch (error) {
                console.error("Error during image moderation:", error);
                toast.error("Unable to verify image safety. Please try again.");
                event.target.value = '';
                return;
            }
        }

        setUploadQueue(validFiles.map((file) => file.name));

        try {
            console.log("Starting upload of", validFiles.length, "files");

            // Upload files one by one for better error handling
            const uploadedAttachments: Attachment[] = [];
            for (const file of validFiles) {
                try {
                    console.log(`Uploading file: ${file.name} (${file.type})`);
                    const attachment = await uploadFile(file);
                    uploadedAttachments.push(attachment);
                    console.log(`Successfully uploaded: ${file.name}`);
                } catch (err) {
                    console.error(`Failed to upload ${file.name}:`, err);
                }
            }

            console.log("Upload completed for", uploadedAttachments.length, "files");

            if (uploadedAttachments.length > 0) {
                setAttachments(currentAttachments => [
                    ...currentAttachments,
                    ...uploadedAttachments,
                ]);

                toast.success(`${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`);
            } else {
                toast.error("No files were successfully uploaded");
            }
        } catch (error) {
            console.error("Error uploading files!", error);
            toast.error("Failed to upload one or more files. Please try again.");
        } finally {
            setUploadQueue([]);
            event.target.value = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachments, setAttachments, selectedModel, setSelectedModel]);

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        // Only check if we've reached the attachment limit
        if (attachments.length >= MAX_FILES) return;

        // Always show drag UI when files are dragged over
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            // Check if at least one item is a file
            const hasFile = Array.from(e.dataTransfer.items).some(item => item.kind === "file");
            if (hasFile) {
                setIsDragging(true);
            }
        }
    }, [attachments.length]);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const getFirstVisionModel = useCallback(() => {
        return models.find(model => model.vision)?.value || selectedModel;
    }, [selectedModel]);

    // Fix the handleDrop function specifically to ensure uploads happen
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        // Log raw files first
        const allFiles = Array.from(e.dataTransfer.files);
        console.log("Raw files dropped:", allFiles.map(f => `${f.name} (${f.type})`));

        if (allFiles.length === 0) {
            toast.error("No files detected in drop");
            return;
        }

        // Simple verification to ensure we're actually getting Files from the drop
        toast.info(`Detected ${allFiles.length} dropped files`);

        // First, separate images and PDFs
        const imageFiles: File[] = [];
        const pdfFiles: File[] = [];
        const unsupportedFiles: File[] = [];
        const oversizedFiles: File[] = [];

        allFiles.forEach(file => {
            console.log(`Processing file: ${file.name} (${file.type})`);

            // Check file size first
            if (file.size > MAX_FILE_SIZE) {
                oversizedFiles.push(file);
                return;
            }

            // Then check file type
            if (file.type.startsWith('image/')) {
                imageFiles.push(file);
            } else if (file.type === 'application/pdf') {
                pdfFiles.push(file);
            } else {
                unsupportedFiles.push(file);
            }
        });

        console.log(`Images: ${imageFiles.length}, PDFs: ${pdfFiles.length}, Unsupported: ${unsupportedFiles.length}, Oversized: ${oversizedFiles.length}`);

        if (unsupportedFiles.length > 0) {
            console.log("Unsupported files:", unsupportedFiles.map(f => `${f.name} (${f.type})`));
            toast.error(`Some files not supported: ${unsupportedFiles.map(f => f.name).join(', ')}`);
        }

        if (oversizedFiles.length > 0) {
            console.log("Oversized files:", oversizedFiles.map(f => `${f.name} (${f.size} bytes)`));
            toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        }

        // Check if we have any supported files
        if (imageFiles.length === 0 && pdfFiles.length === 0) {
            toast.error("Only image and PDF files are supported");
            return;
        }

        // Auto-switch to PDF-compatible model if PDFs are present
        const currentModelData = models.find(m => m.value === selectedModel);
        if (pdfFiles.length > 0 && (!currentModelData || !currentModelData.pdf)) {
            console.log("PDFs detected, switching to compatible model");

            // Find first compatible model that supports PDFs
            const compatibleModel = models.find(m => m.pdf && m.vision);

            if (compatibleModel) {
                console.log("Switching to compatible model:", compatibleModel.value);
                setSelectedModel(compatibleModel.value);
                toast.info(`Switching to ${compatibleModel.label} to support PDF files`);
                showSwitchNotification(
                    compatibleModel.label,
                    'Switched to a model that supports PDF documents',
                    typeof compatibleModel.icon === 'string' ?
                        <img src={compatibleModel.icon} alt={compatibleModel.label} className="size-4 object-contain" /> :
                        <compatibleModel.icon className="size-4" />,
                    compatibleModel.color,
                    'model'
                );
            } else {
                console.warn("No PDF-compatible model found");
                toast.error("PDFs are only supported by Gemini and Claude models");
                // Continue with only image files
                if (imageFiles.length === 0) return;
            }
        }

        // Combine valid files
        let validFiles: File[] = [...imageFiles];
        if (supportsPdfAttachments(selectedModel) || pdfFiles.length > 0) {
            validFiles = [...validFiles, ...pdfFiles];
        }

        console.log("Files to upload:", validFiles.map(f => `${f.name} (${f.type})`));

        // Check total attachment count
        const totalAttachments = attachments.length + validFiles.length;
        if (totalAttachments > MAX_FILES) {
            toast.error(`You can only attach up to ${MAX_FILES} files.`);
            return;
        }

        if (validFiles.length === 0) {
            console.error("No valid files to upload after filtering");
            toast.error("No valid files to upload");
            return;
        }

        // Check image moderation before proceeding
        if (imageFiles.length > 0) {
            try {
                console.log("Checking image moderation for", imageFiles.length, "images");
                toast.info("Checking images for safety...");

                // Convert images to data URLs for moderation
                const imageDataURLs = await Promise.all(
                    imageFiles.map(file => fileToDataURL(file))
                );

                // Check moderation
                const moderationResult = await checkImageModeration(imageDataURLs);
                console.log("Moderation result:", moderationResult);

                if (moderationResult !== 'safe') {
                    const [status, category] = moderationResult.split('\n');
                    if (status === 'unsafe') {
                        console.warn("Unsafe image detected, category:", category);
                        toast.error(`Image content violates safety guidelines (${category}). Please choose different images.`);
                        return;
                    }
                }

                console.log("Images passed moderation check");
            } catch (error) {
                console.error("Error during image moderation:", error);
                toast.error("Unable to verify image safety. Please try again.");
                return;
            }
        }

        // Switch to vision model if current model doesn't support vision
        if (!currentModelData?.vision) {
            // Find the appropriate vision model based on file types
            let visionModel: string;

            // If we have PDFs, prioritize a PDF-compatible model
            if (pdfFiles.length > 0) {
                const pdfCompatibleModel = models.find(m => m.vision && m.pdf);
                if (pdfCompatibleModel) {
                    visionModel = pdfCompatibleModel.value;
                } else {
                    visionModel = getFirstVisionModel();
                }
            } else {
                visionModel = getFirstVisionModel();
            }

            console.log("Switching to vision model:", visionModel);
            setSelectedModel(visionModel);

            const modelData = models.find(m => m.value === visionModel);
            if (modelData) {
                showSwitchNotification(
                    modelData.label,
                    `Vision model enabled - you can now attach images${modelData.pdf ? ' and PDFs' : ''}`,
                    typeof modelData.icon === 'string' ?
                        <img src={modelData.icon} alt={modelData.label} className="size-4 object-contain" /> :
                        <modelData.icon className="size-4" />,
                    modelData.color,
                    'model'  // Explicitly mark as model notification
                );
            }
        }

        // Set upload queue immediately
        setUploadQueue(validFiles.map((file) => file.name));
        toast.info(`Starting upload of ${validFiles.length} files...`);

        // Forced timeout to ensure state updates before upload starts
        setTimeout(async () => {
            try {
                console.log("Beginning upload of", validFiles.length, "files");

                // Try uploading one by one instead of all at once
                const uploadedAttachments: Attachment[] = [];
                for (const file of validFiles) {
                    try {
                        console.log(`Uploading file: ${file.name} (${file.type})`);
                        const attachment = await uploadFile(file);
                        uploadedAttachments.push(attachment);
                        console.log(`Successfully uploaded: ${file.name}`);
                    } catch (err) {
                        console.error(`Failed to upload ${file.name}:`, err);
                    }
                }

                console.log("Upload completed for", uploadedAttachments.length, "files");

                if (uploadedAttachments.length > 0) {
                    setAttachments(currentAttachments => [
                        ...currentAttachments,
                        ...uploadedAttachments,
                    ]);

                    toast.success(`${uploadedAttachments.length} file${uploadedAttachments.length > 1 ? 's' : ''} uploaded successfully`);
                } else {
                    toast.error("No files were successfully uploaded");
                }
            } catch (error) {
                console.error("Error during file upload:", error);
                toast.error("Upload failed. Please check console for details.");
            } finally {
                setUploadQueue([]);
            }
        }, 100);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel]);

    const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const imageItems = items.filter(item => item.type.startsWith('image/'));
        // Note: Pasting PDFs directly is typically not possible, but we're updating the code for consistency

        if (imageItems.length === 0) return;

        // Prevent default paste behavior if there are images
        e.preventDefault();

        const totalAttachments = attachments.length + imageItems.length;
        if (totalAttachments > MAX_FILES) {
            toast.error(`You can only attach up to ${MAX_FILES} files.`);
            return;
        }

        // Get files and check sizes before proceeding
        const files = imageItems.map(item => item.getAsFile()).filter(Boolean) as File[];
        const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);

        if (oversizedFiles.length > 0) {
            console.log("Oversized files:", oversizedFiles.map(f => `${f.name} (${f.size} bytes)`));
            toast.error(`Some files exceed the 5MB limit: ${oversizedFiles.map(f => f.name || 'unnamed').join(', ')}`);

            // Filter out oversized files
            const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
            if (validFiles.length === 0) return;
        }

        // Switch to vision model if needed
        const currentModel = models.find(m => m.value === selectedModel);
        if (!currentModel?.vision) {
            const visionModel = getFirstVisionModel();
            setSelectedModel(visionModel);

            const modelData = models.find(m => m.value === visionModel);
            if (modelData) {
                const supportsPdfs = supportsPdfAttachments(visionModel);
                showSwitchNotification(
                    modelData.label,
                    `Vision model enabled - you can now attach images${supportsPdfs ? ' and PDFs' : ''}`,
                    typeof modelData.icon === 'string' ?
                        <img src={modelData.icon} alt={modelData.label} className="size-4 object-contain" /> :
                        <modelData.icon className="size-4" />,
                    modelData.color,
                    'model'  // Explicitly mark as model notification
                );
            }
        }

        // Use filtered files if we found oversized ones
        const filesToUpload = oversizedFiles.length > 0
            ? files.filter(file => file.size <= MAX_FILE_SIZE)
            : files;

        // Check image moderation before uploading
        if (filesToUpload.length > 0) {
            try {
                console.log("Checking image moderation for", filesToUpload.length, "pasted images");
                toast.info("Checking pasted images for safety...");

                // Convert images to data URLs for moderation
                const imageDataURLs = await Promise.all(
                    filesToUpload.map(file => fileToDataURL(file))
                );

                // Check moderation
                const moderationResult = await checkImageModeration(imageDataURLs);
                console.log("Moderation result:", moderationResult);

                if (moderationResult !== 'safe') {
                    const [status, category] = moderationResult.split('\n');
                    if (status === 'unsafe') {
                        console.warn("Unsafe pasted image detected, category:", category);
                        toast.error(`Pasted image content violates safety guidelines (${category}). Please choose different images.`);
                        return;
                    }
                }

                console.log("Pasted images passed moderation check");
            } catch (error) {
                console.error("Error during pasted image moderation:", error);
                toast.error("Unable to verify pasted image safety. Please try again.");
                return;
            }
        }

        setUploadQueue(filesToUpload.map((file, i) => file.name || `Pasted Image ${i + 1}`));

        try {
            const uploadPromises = filesToUpload.map(file => uploadFile(file));
            const uploadedAttachments = await Promise.all(uploadPromises);

            setAttachments(currentAttachments => [
                ...currentAttachments,
                ...uploadedAttachments,
            ]);

            toast.success('Image pasted successfully');
        } catch (error) {
            console.error("Error uploading pasted files!", error);
            toast.error("Failed to upload pasted image. Please try again.");
        } finally {
            setUploadQueue([]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachments.length, setAttachments, uploadFile, selectedModel, setSelectedModel, getFirstVisionModel]);

    useEffect(() => {
        if (status !== 'ready' && inputRef?.current) {
            const focusTimeout = setTimeout(() => {
                if (isMounted.current && inputRef.current) {
                    inputRef.current.focus({
                        preventScroll: true
                    });
                }
            }, 300);

            return () => clearTimeout(focusTimeout);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [status]);

    const onSubmit = useCallback((event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (status !== 'ready') {
            toast.error("Please wait for the current response to complete!");
            return;
        }

        // Check if input exceeds character limit
        if (input.length > MAX_INPUT_CHARS) {
            toast.error(`Your input exceeds the maximum of ${MAX_INPUT_CHARS} characters. Please shorten your message.`);
            return;
        }

        if (input.trim() || attachments.length > 0) {
            track('model_selected', {
                model: selectedModel,
            });

            if (user) {
                window.history.replaceState({}, '', `/search/${chatId}`);
            }

            setHasSubmitted(true);
            lastSubmittedQueryRef.current = input.trim();

            handleSubmit(event, {
                experimental_attachments: attachments,
            });

            setAttachments([]);
            if (fileInputRef?.current) {
                fileInputRef.current.value = '';
            }
        } else {
            toast.error("Please enter a search query or attach an image.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [input, attachments, handleSubmit, setAttachments, fileInputRef, lastSubmittedQueryRef, status, selectedModel, setHasSubmitted]);

    const submitForm = useCallback(() => {
        onSubmit({ preventDefault: () => { }, stopPropagation: () => { } } as React.FormEvent<HTMLFormElement>);
        // resetSuggestedQuestions();

        if (width && width > 768) {
            inputRef?.current?.focus();
        }
    }, [onSubmit, resetSuggestedQuestions, width, inputRef]);

    const triggerFileInput = useCallback(() => {
        if (attachments.length >= MAX_FILES) {
            toast.error(`You can only attach up to ${MAX_FILES} images.`);
            return;
        }

        if (status === 'ready') {
            postSubmitFileInputRef.current?.click();
        } else {
            fileInputRef?.current?.click();
        }
    }, [attachments.length, status, fileInputRef]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey && !isCompositionActive.current) {
            event.preventDefault();
            if (status === 'submitted' || status === 'streaming') {
                toast.error("Please wait for the response to complete!");
            } else {
                submitForm();
                if (width && width > 768) {
                    setTimeout(() => {
                        inputRef?.current?.focus();
                    }, 100);
                }
            }
        }
    };

    const isProcessing = status === 'submitted' || status === 'streaming';
    const hasInteracted = messages.length > 0;
    const isMobile = width ? width < 768 : false;

    // Auto-resize function for textarea
    const resizeTextarea = useCallback(() => {
        if (!inputRef?.current) return;
        
        const target = inputRef.current;
        
        // Reset height to auto first to get the actual scroll height
        target.style.height = 'auto';
        
        const scrollHeight = target.scrollHeight;
        const maxHeight = width && width < 768 ? 200 : 300;
        
        if (scrollHeight > maxHeight) {
            target.style.height = `${maxHeight}px`;
            target.style.overflowY = 'auto';
        } else {
            target.style.height = `${scrollHeight}px`;
            target.style.overflowY = 'hidden';
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width]);

    // Resize textarea when input value changes
    useEffect(() => {
        resizeTextarea();
    }, [input, resizeTextarea]);

    return (
        <div className="flex flex-col w-full">
            <TooltipProvider>
                <div
                    className={cn(
                        "relative w-full flex flex-col gap-1 rounded-lg transition-all duration-300 font-sans!",
                        hasInteracted ? "z-51" : "",
                        isDragging && "ring-1 ring-neutral-300 dark:ring-neutral-700",
                        attachments.length > 0 || uploadQueue.length > 0
                            ? "bg-gray-100/70 dark:bg-neutral-800 p-1"
                            : "bg-transparent"
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <AnimatePresence>
                        {isDragging && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 backdrop-blur-[2px] bg-background/80 dark:bg-neutral-900/80 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center z-50 m-2"
                            >
                                <div className="flex items-center gap-4 px-6 py-8">
                                    <div className="p-3 rounded-full bg-neutral-100 dark:bg-neutral-800 shadow-xs">
                                        <Upload className="h-6 w-6 text-neutral-600 dark:text-neutral-400" />
                                    </div>
                                    <div className="space-y-1 text-center">
                                        <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                                            Drop images or PDFs here
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-500">
                                            Max {MAX_FILES} files (5MB per file)
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <input
                        type="file"
                        className="hidden"
                        ref={fileInputRef}
                        multiple
                        onChange={handleFileChange}
                        accept={getAcceptFileTypes(selectedModel)}
                        tabIndex={-1}
                    />
                    <input
                        type="file"
                        className="hidden"
                        ref={postSubmitFileInputRef}
                        multiple
                        onChange={handleFileChange}
                        accept={getAcceptFileTypes(selectedModel)}
                        tabIndex={-1}
                    />

                    {(attachments.length > 0 || uploadQueue.length > 0) && (
                        <div className="flex flex-row gap-2 overflow-x-auto py-2 max-h-28 z-10 px-1 scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-700 scrollbar-track-transparent">
                            {attachments.map((attachment, index) => (
                                <AttachmentPreview
                                    key={attachment.url}
                                    attachment={attachment}
                                    onRemove={() => removeAttachment(index)}
                                    isUploading={false}
                                />
                            ))}
                            {uploadQueue.map((filename) => (
                                <AttachmentPreview
                                    key={filename}
                                    attachment={{
                                        url: "",
                                        name: filename,
                                        contentType: "",
                                        size: 0,
                                    } as Attachment}
                                    onRemove={() => { }}
                                    isUploading={true}
                                />
                            ))}
                        </div>
                    )}

                    {/* Form container with switch notification */}
                    <div className="relative">
                        <SwitchNotification
                            icon={switchNotification.icon}
                            title={switchNotification.title}
                            description={switchNotification.description}
                            isVisible={switchNotification.show}
                            modelColor={switchNotification.notificationType === 'model' ?
                                models.find(m => m.value === selectedModel)?.color :
                                selectedGroup}
                            notificationType={switchNotification.notificationType}
                        />

                        <div className="rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200! dark:border-neutral-700! focus-within:border-neutral-300! dark:focus-within:border-neutral-500! transition-colors duration-200">
                            <Textarea
                                ref={inputRef}
                                placeholder={hasInteracted ? "Ask a new question..." : "Ask a question..."}
                                value={input}
                                onChange={handleInput}
                                // disabled={isProcessing}
                                onFocus={handleFocus}
                                onBlur={handleBlur}
                                onInput={(e) => {
                                    // Auto-resize textarea based on content
                                    const target = e.target as HTMLTextAreaElement;
                                    
                                    // Reset height to auto first to get the actual scroll height
                                    target.style.height = 'auto';
                                    
                                    const scrollHeight = target.scrollHeight;
                                    const maxHeight = width && width < 768 ? 200 : 300; // Increased max height for desktop
                                    
                                    if (scrollHeight > maxHeight) {
                                        target.style.height = `${maxHeight}px`;
                                        target.style.overflowY = 'auto';
                                    } else {
                                        target.style.height = `${scrollHeight}px`;
                                        target.style.overflowY = 'hidden';
                                    }
                                    
                                    // Ensure the cursor position is visible by scrolling to bottom if needed
                                    requestAnimationFrame(() => {
                                        const cursorPosition = target.selectionStart;
                                        if (cursorPosition === target.value.length) {
                                            target.scrollTop = target.scrollHeight;
                                        }
                                    });
                                }}
                                className={cn(
                                    "w-full rounded-lg rounded-b-none md:text-base!",
                                    "text-base leading-relaxed",
                                    "bg-neutral-100 dark:bg-neutral-900",
                                    "border-0!",
                                    "text-neutral-900 dark:text-neutral-100",
                                    "focus:ring-0! focus-visible:ring-0!",
                                    "px-4! py-4!",
                                    "touch-manipulation",
                                    "whatsize"
                                )}
                                style={{
                                    WebkitUserSelect: 'text',
                                    WebkitTouchCallout: 'none',
                                    minHeight: width && width < 768 ? '40px' : undefined,
                                    resize: 'none',
                                }}
                                rows={1}
                                autoFocus={width ? width > 768 : true}
                                onCompositionStart={() => isCompositionActive.current = true}
                                onCompositionEnd={() => isCompositionActive.current = false}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                            />

                            {/* Toolbar as a separate block - no absolute positioning */}
                            <div
                                className={cn(
                                    "flex justify-between items-center p-2 rounded-t-none rounded-b-lg",
                                    "bg-neutral-100 dark:bg-neutral-900",
                                    "border-t-0 border-neutral-200! dark:border-neutral-700!",
                                    isProcessing ? "opacity-20! cursor-not-allowed!" : ""
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center gap-2",
                                        isMobile && "overflow-hidden"
                                    )}
                                >
                                    <div className={cn(
                                        "transition-all duration-100",
                                        (selectedGroup !== 'extreme')
                                            ? "opacity-100 visible w-auto"
                                            : "opacity-0 invisible w-0"
                                    )}>
                                        <GroupSelector
                                            selectedGroup={selectedGroup}
                                            onGroupSelect={handleGroupSelect}
                                            status={status}
                                            onExpandChange={setIsGroupSelectorExpanded}
                                        />
                                    </div>

                                    <div className={cn(
                                        "transition-all duration-300",
                                        (isMobile && isGroupSelectorExpanded)
                                            ? "opacity-0 invisible w-0"
                                            : "opacity-100 visible w-auto"
                                    )}>
                                        <ModelSwitcher
                                            selectedModel={selectedModel}
                                            setSelectedModel={setSelectedModel}
                                            showExperimentalModels={showExperimentalModels}
                                            attachments={attachments}
                                            messages={messages}
                                            status={status}
                                            onModelSelect={(model) => {
                                                // Show additional info about image attachments for vision models
                                                const isVisionModel = model.vision === true;
                                                showSwitchNotification(
                                                    model.label,
                                                    isVisionModel
                                                        ? 'Vision model enabled - you can now attach images and PDFs'
                                                        : model.description,
                                                    typeof model.icon === 'string' ?
                                                        <img src={model.icon} alt={model.label} className="size-4 object-contain" /> :
                                                        <model.icon className="size-4" />,
                                                    model.color,
                                                    'model'  // Explicitly mark as model notification
                                                );
                                            }}
                                        />
                                    </div>

                                    <div className={cn(
                                        "transition-all duration-300",
                                        (isMobile && isGroupSelectorExpanded)
                                            ? "opacity-0 invisible w-0"
                                            : "opacity-100 visible w-auto"
                                    )}>
                                        {!isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            const newMode = selectedGroup === 'extreme' ? 'web' : 'extreme';
                                                            setSelectedGroup(newMode);

                                                            // Enhanced notification messages
                                                            const newModeText = selectedGroup === 'extreme' ? 'Switched to Web Search' : 'Switched to Extreme Mode';
                                                            const description = selectedGroup === 'extreme'
                                                                ? 'Standard web search mode is now active'
                                                                : 'Enhanced deep research mode is now active';

                                                            // Use appropriate colors for groups that don't conflict with model colors
                                                            showSwitchNotification(
                                                                newModeText,
                                                                description,
                                                                selectedGroup === 'extreme' ? <Globe className="size-4" /> : <TelescopeIcon className="size-4" />,
                                                                newMode, // Use the new mode as the color identifier
                                                                'group'  // Specify this is a group notification
                                                            );
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 p-2 sm:px-3 h-8",
                                                            "rounded-full transition-all duration-300",
                                                            "border border-neutral-200 dark:border-neutral-800",
                                                            "hover:shadow-md",
                                                            selectedGroup === 'extreme'
                                                                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                                                : "bg-white dark:bg-neutral-900 text-neutral-500",
                                                        )}
                                                    >
                                                        <TelescopeIcon className="h-3.5 w-3.5" />
                                                        <span className="hidden sm:block text-xs font-medium">Extreme</span>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3 max-w-[200px]"
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-[11px]">Extreme Mode</span>
                                                        <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">Deep research with multiple sources and analysis</span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    const newMode = selectedGroup === 'extreme' ? 'web' : 'extreme';
                                                    setSelectedGroup(newMode);

                                                    // Enhanced notification messages
                                                    const newModeText = selectedGroup === 'extreme' ? 'Switched to Web Search' : 'Switched to Extreme Mode';
                                                    const description = selectedGroup === 'extreme'
                                                        ? 'Standard web search mode is now active'
                                                        : 'Enhanced deep research mode is now active';

                                                    // Use appropriate colors for groups that don't conflict with model colors
                                                    showSwitchNotification(
                                                        newModeText,
                                                        description,
                                                        selectedGroup === 'extreme' ? <Globe className="size-4" /> : <TelescopeIcon className="size-4" />,
                                                        newMode, // Use the new mode as the color identifier
                                                        'group'  // Specify this is a group notification
                                                    );
                                                }}
                                                className={cn(
                                                    "flex items-center gap-2 p-2 sm:px-3 h-8",
                                                    "rounded-full transition-all duration-300",
                                                    "border border-neutral-200 dark:border-neutral-800",
                                                    "hover:shadow-md",
                                                    selectedGroup === 'extreme'
                                                        ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                                                        : "bg-white dark:bg-neutral-900 text-neutral-500",
                                                )}
                                            >
                                                <TelescopeIcon className="h-3.5 w-3.5" />
                                                <span className="hidden sm:block text-xs font-medium">Extreme</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {hasVisionSupport(selectedModel) && !(isMobile && isGroupSelectorExpanded) && (
                                        !isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        className="rounded-full p-1.5 h-8 w-8 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            triggerFileInput();
                                                        }}
                                                        variant="outline"
                                                        // disabled={isProcessing}
                                                    >
                                                        <PaperclipIcon size={14} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className=" border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                                                >
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="font-medium text-[11px]">Attach File</span>
                                                        <span className="text-[10px] text-neutral-300 dark:text-neutral-600 leading-tight">
                                                            {supportsPdfAttachments(selectedModel)
                                                                ? "Upload an image or PDF document"
                                                                : "Upload an image"}
                                                        </span>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Button
                                                className="rounded-full p-1.5 h-8 w-8 bg-white dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    triggerFileInput();
                                                }}
                                                variant="outline"
                                                // disabled={isProcessing}
                                            >
                                                <PaperclipIcon size={14} />
                                            </Button>
                                        )
                                    )}

                                    {isProcessing ? (
                                        !isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        className="rounded-full p-1.5 h-8 w-8"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            stop();
                                                        }}
                                                        variant="destructive"
                                                    >
                                                        <StopIcon size={14} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                                                >
                                                    <span className="font-medium text-[11px]">Stop Generation</span>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Button
                                                className="rounded-full p-1.5 h-8 w-8"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    stop();
                                                }}
                                                variant="destructive"
                                            >
                                                <StopIcon size={14} />
                                            </Button>
                                        )
                                    ) : (
                                        !isMobile ? (
                                            <Tooltip delayDuration={300}>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        className="rounded-full p-1.5 h-8 w-8"
                                                        onClick={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            submitForm();
                                                        }}
                                                        disabled={input.length === 0 && attachments.length === 0 || uploadQueue.length > 0 || status !== 'ready'}
                                                    >
                                                        <ArrowUpIcon size={14} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent
                                                    side="bottom"
                                                    sideOffset={6}
                                                    className="border-0 shadow-lg backdrop-blur-xs py-2 px-3"
                                                >
                                                    <span className="font-medium text-[11px]">Send Message</span>
                                                </TooltipContent>
                                            </Tooltip>
                                        ) : (
                                            <Button
                                                className="rounded-full p-1.5 h-8 w-8"
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    submitForm();
                                                }}
                                                disabled={input.length === 0 && attachments.length === 0 || uploadQueue.length > 0 || status !== 'ready'}
                                            >
                                                <ArrowUpIcon size={14} />
                                            </Button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </TooltipProvider>
        </div>
    );
};

export default FormComponent;
