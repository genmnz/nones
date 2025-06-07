
// Interfaces
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






// from search.ts route
export const CURRENCY_SYMBOLS = {
    USD: '$', EUR: '€', GBP: '£',
    JPY: '¥', CNY: '¥', INR: '₹', RUB: '₽',
    KRW: '₩', BTC: '₿', THB: '฿', BRL: 'R$',
    PHP: '₱', ILS: '₪', TRY: '₺', NGN: '₦', VND: '₫',
    ARS: '$', ZAR: 'R', AUD: 'A$', CAD: 'C$',
    SGD: 'S$', HKD: 'HK$', NZD: 'NZ$', MXN: 'Mex$'
} as const;

export interface MapboxFeature {
    id: string;
    name: string;
    formatted_address: string;
    geometry: {
        type: string;
        coordinates: number[];
    };
    feature_type: string;
    context: string;
    coordinates: number[];
    bbox: number[];
    source: string;
}

export interface GoogleResult {
    place_id: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
        viewport: {
            northeast: {
                lat: number;
                lng: number;
            };
            southwest: {
                lat: number;
                lng: number;
            };
        };
    };
    types: string[];
    address_components: Array<{
        long_name: string;
        short_name: string;
        types: string[];
    }>;
}




// Initialize Exa client

// Add interface for Exa search results
export interface ExaResult {
    title: string;
    url: string;
    publishedDate?: string;
    author?: string;
    score?: number;
    id: string;
    image?: string;
    favicon?: string;
    text: string;
    highlights?: string[];
    highlightScores?: number[];
    summary?: string;
    subpages?: ExaResult[];
    extras?: {
        links: any[];
    };
}