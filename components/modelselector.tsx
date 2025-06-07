"use client"
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn, getColorClasses } from "@/lib/utils";
import { BrainCircuit, EyeIcon } from "lucide-react";
import { models } from "@/ai/models";
import { Message } from "ai";
import { motion } from "motion/react";


interface Attachment {
    name: string;
    contentType: string;
    url: string;
    size: number;
}
interface UploadingAttachment {
    file: File;
    progress: number;
}
interface ModelSwitcherProps {
    selectedModel: string;
    setSelectedModel: (value: string) => void;
    className?: string;
    showExperimentalModels: boolean;
    attachments: Array<Attachment | UploadingAttachment>;
    messages: Array<Message>;
    status: 'submitted' | 'streaming' | 'ready' | 'error';
    onModelSelect?: (model: typeof models[0]) => void;
}

export const ModelSwitcher: React.FC<ModelSwitcherProps> = ({ selectedModel, setSelectedModel, className, showExperimentalModels, attachments, messages, status, onModelSelect }) => {
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
