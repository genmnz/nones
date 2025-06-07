import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface SwitchNotificationProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    isVisible: boolean;
    modelColor?: string;
    notificationType?: 'model' | 'group';
}


export const SwitchNotification: React.FC<SwitchNotificationProps> = ({
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