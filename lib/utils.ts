// /lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function invalidateChatsCache() {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('invalidate-chats-cache');
    window.dispatchEvent(event);
  }
}

export const getColorClasses = (color: string, isSelected: boolean = false) => {
  const baseClasses = "transition-colors duration-200";
  const selectedClasses = isSelected ? "bg-opacity-100! dark:bg-opacity-100!" : "";

  switch (color) {
      case 'black':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#0F0F0F]! dark:bg-[#0F0F0F]! text-white! hover:bg-[#0F0F0F]! dark:hover:bg-[#0F0F0F]! border-[#0F0F0F]! dark:border-[#0F0F0F]!`
              : `${baseClasses} text-[#0F0F0F]! dark:text-[#E5E5E5]! hover:bg-[#0F0F0F]! hover:text-white! dark:hover:bg-[#0F0F0F]! dark:hover:text-white!`;
      case 'gray':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#4E4E4E]! dark:bg-[#4E4E4E]! text-white! hover:bg-[#3D3D3D]! dark:hover:bg-[#3D3D3D]! border-[#4E4E4E]! dark:border-[#4E4E4E]!`
              : `${baseClasses} text-[#4E4E4E]! dark:text-[#E5E5E5]! hover:bg-[#4E4E4E]! hover:text-white! dark:hover:bg-[#4E4E4E]! dark:hover:text-white!`;
      case 'indigo':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#4F46E5]! dark:bg-[#4F46E5]! text-white! hover:bg-[#4338CA]! dark:hover:bg-[#4338CA]! border-[#4F46E5]! dark:border-[#4F46E5]!`
              : `${baseClasses} text-[#4F46E5]! dark:text-[#6366F1]! hover:bg-[#4F46E5]! hover:text-white! dark:hover:bg-[#4F46E5]! dark:hover:text-white!`;
      case 'violet':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#8B5CF6]! dark:bg-[#8B5CF6]! text-white! hover:bg-[#7C3AED]! dark:hover:bg-[#7C3AED]! border-[#8B5CF6]! dark:border-[#8B5CF6]!`
              : `${baseClasses} text-[#8B5CF6]! dark:text-[#A78BFA]! hover:bg-[#8B5CF6]! hover:text-white! dark:hover:bg-[#8B5CF6]! dark:hover:text-white!`;
      case 'purple':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#5E5ADB]! dark:bg-[#5E5ADB]! text-white! hover:bg-[#4D49C9]! dark:hover:bg-[#4D49C9]! border-[#5E5ADB]! dark:border-[#5E5ADB]!`
              : `${baseClasses} text-[#5E5ADB]! dark:text-[#5E5ADB]! hover:bg-[#5E5ADB]! hover:text-white! dark:hover:bg-[#5E5ADB]! dark:hover:text-white!`;
      case 'alpha':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-linear-to-r! from-[#0b3d91]! to-[#d01012]! dark:bg-linear-to-r! dark:from-[#0b3d91]! dark:to-[#d01012]! text-white! hover:opacity-90! border-[#0b3d91]! dark:border-[#0b3d91]!`
              : `${baseClasses} text-[#d01012]! dark:text-[#3f83f8]! hover:bg-linear-to-r! hover:from-[#0b3d91]! hover:to-[#d01012]! hover:text-white! dark:hover:text-white!`;
      case 'blue':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#1C7DFF]! dark:bg-[#1C7DFF]! text-white! hover:bg-[#0A6AE9]! dark:hover:bg-[#0A6AE9]! border-[#1C7DFF]! dark:border-[#1C7DFF]!`
              : `${baseClasses} text-[#1C7DFF]! dark:text-[#4C96FF]! hover:bg-[#1C7DFF]! hover:text-white! dark:hover:bg-[#1C7DFF]! dark:hover:text-white!`;
      case 'gemini':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#1EA896]! dark:bg-[#1EA896]! text-white! hover:bg-[#19967F]! dark:hover:bg-[#19967F]! border-[#1EA896]! dark:border-[#1EA896]!`
              : `${baseClasses} text-[#1EA896]! dark:text-[#34C0AE]! hover:bg-[#1EA896]! hover:text-white! dark:hover:bg-[#1EA896]! dark:hover:text-white!`;
      case 'vercel-gray':
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-[#27272A]! dark:bg-[#27272A]! text-white! hover:bg-[#18181B]! dark:hover:bg-[#18181B]! border-[#27272A]! dark:border-[#27272A]!`
              : `${baseClasses} text-[#27272A]! dark:text-[#A1A1AA]! hover:bg-[#27272A]! hover:text-white! dark:hover:bg-[#27272A]! dark:hover:text-white!`;
      default:
          return isSelected
              ? `${baseClasses} ${selectedClasses} bg-neutral-500! dark:bg-neutral-700! text-white! hover:bg-neutral-600! dark:hover:bg-neutral-800! border-neutral-500! dark:border-neutral-700!`
              : `${baseClasses} text-neutral-600! dark:text-neutral-300! hover:bg-neutral-500! hover:text-white! dark:hover:bg-neutral-700! dark:hover:text-white!`;
  }
}

export const extractDomain = (url: string): string => {
  const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
  return url.match(urlPattern)?.[1] || url;
};

export const deduplicateByDomainAndUrl = <T extends { url: string }>(items: T[]): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter(item => {
      const domain = extractDomain(item.url);
      const isNewUrl = !seenUrls.has(item.url);
      const isNewDomain = !seenDomains.has(domain);

      if (isNewUrl && isNewDomain) {
          seenUrls.add(item.url);
          seenDomains.add(domain);
          return true;
      }
      return false;
  });
};





export async function isValidImageUrl(url: string): Promise<{ valid: boolean; redirectedUrl?: string }> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(url, {
            method: 'HEAD',
            signal: controller.signal,
            headers: {
                'Accept': 'image/*,.pdf",',
                'User-Agent': 'Mozilla/5.0 (compatible; ImageValidator/1.0)'
            },
            redirect: 'follow' // Ensure redirects are followed
        });

        clearTimeout(timeout);

        // Log response details for debugging
        console.log(`Image validation [${url}]: status=${response.status}, content-type=${response.headers.get('content-type')}`);

        // Capture redirected URL if applicable
        const redirectedUrl = response.redirected ? response.url : undefined;

        // Check if we got redirected (for logging purposes)
        if (response.redirected) {
            console.log(`Image was redirected from ${url} to ${redirectedUrl}`);
        }

        // Handle specific response codes
        if (response.status === 404) {
            console.log(`Image not found (404): ${url}`);
            return { valid: false };
        }

        if (response.status === 403) {
            console.log(`Access forbidden (403) - likely CORS issue: ${url}`);

            // Try to use proxy instead of whitelisting domains
            try {
                // Attempt to handle CORS blocked images by trying to access via proxy
                const controller = new AbortController();
                const proxyTimeout = setTimeout(() => controller.abort(), 5000);

                const proxyResponse = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`, {
                    method: 'HEAD',
                    signal: controller.signal
                });

                clearTimeout(proxyTimeout);

                if (proxyResponse.ok) {
                    const contentType = proxyResponse.headers.get('content-type');
                    const proxyRedirectedUrl = proxyResponse.headers.get('x-final-url') || undefined;

                    if (contentType && contentType.startsWith('image/')) {
                        console.log(`Proxy validation successful for ${url}`);
                        return {
                            valid: true,
                            redirectedUrl: proxyRedirectedUrl || redirectedUrl
                        };
                    }
                }
            } catch (proxyError) {
                console.error(`Proxy validation failed for ${url}:`, proxyError);
            }
            return { valid: false };
        }

        if (response.status >= 400) {
            console.log(`Image request failed with status ${response.status}: ${url}`);
            return { valid: false };
        }

        // Check content type to ensure it's actually an image
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.log(`Invalid content type for image: ${contentType}, url: ${url}`);
            return { valid: false };
        }

        return { valid: true, redirectedUrl };
    } catch (error) {
        // Check if error is related to CORS
        const errorMsg = error instanceof Error ? error.message : String(error);

        if (errorMsg.includes('CORS') || errorMsg.includes('blocked by CORS policy')) {
            console.error(`CORS error for ${url}:`, errorMsg);

            // Try to use proxy instead of whitelisting domains
            try {
                // Attempt to handle CORS blocked images by trying to access via proxy
                const controller = new AbortController();
                const proxyTimeout = setTimeout(() => controller.abort(), 5000);

                const proxyResponse = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`, {
                    method: 'HEAD',
                    signal: controller.signal
                });

                clearTimeout(proxyTimeout);

                if (proxyResponse.ok) {
                    const contentType = proxyResponse.headers.get('content-type');
                    const proxyRedirectedUrl = proxyResponse.headers.get('x-final-url') || undefined;

                    if (contentType && contentType.startsWith('image/')) {
                        console.log(`Proxy validation successful for ${url}`);
                        return { valid: true, redirectedUrl: proxyRedirectedUrl };
                    }
                }
            } catch (proxyError) {
                console.error(`Proxy validation failed for ${url}:`, proxyError);
            }
        }

        // Log the specific error
        console.error(`Image validation error for ${url}:`, errorMsg);
        return { valid: false };
    }
}
