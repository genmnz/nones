// this is lib\types\search.ts
// for /api/search/route.ts

// === Common Search Types ===
export type SearchImage = {
    /** The direct URL to the image source. */
    url: string;
    /** 
     * A description or alt text for the image. 
     * Mapped from Tavily: images[].description 
     * Mapped from Exa: images[].alt or images[].description
     * Mapped from Linkup: results[].name or results[].title (for type=image)
     */
    description: string;
};

export type SearchResult = {
    /** The direct URL to the search result page. */
    url: string;
    /** 
     * The title of the search result.
     * Mapped from Tavily: results[].title
     * Mapped from Exa: results[].title
     * Mapped from Linkup: results[].title or results[].name (for type!=image)
     */
    title: string;
    /** 
     * The main content snippet or description of the result.
     * Mapped from Tavily: results[].content
     * Mapped from Exa: results[].highlights or results[].text
     * Mapped from Linkup: results[].content or results[].text (for type!=image), or source.text/title (for sourcedAnswer)
     */
    content: string;
    /** 
     * Raw content, potentially longer or less processed than 'content'.
     * Mapped from Tavily: results[].raw_content
     * Mapped from Exa: results[].text
     * Mapped from Linkup: results[].raw_content or results[].content/text (for type!=image)
     */
    raw_content?: string;
    /** 
     * The publication date, if available.
     * Mapped from Tavily: results[].published_date (news only)
     * Mapped from Exa: results[].publishedDate
     * Mapped from Linkup: results[].published_date
     */
    published_date?: string;
    /** 
     * The author, if available.
     * Mapped from Exa: results[].author
     * Mapped from Linkup: results[].author
     */
    author?: string;
    /** 
     * A relevance score, if provided by the search provider.
     * Mapped from Exa: results[].score
     * Mapped from Linkup: results[].score
     */
    score?: number;
    /** 
     * Scores for specific highlighted sections, if provided (e.g., by Exa).
     * Mapped from Exa: results[].highlightScores
     */
    highlight_scores?: number[];
    /** Optional direct URL to the site's favicon, if provided by the search source. */
    favicon?: string;
};

export type SearchQueryResult = {
    /** The original query string for this set of results. */
    query: string;
    /** An array of text-based search results. */
    results: SearchResult[];
    /** An array of image results related to the query. */
    images: SearchImage[];
};

export type MultiSearchResponse = {
    /** An array containing results for each search query performed. */
    searches: SearchQueryResult[];
};

export type QueryCompletion = {
    type: 'query_completion';
    data: {
        query: string;
        index: number;
        total: number;
        status: 'completed' | 'error';
        resultsCount: number;
        imagesCount: number;
        error?: string;
    };
};

// === Twitter/X Search Types ===
export interface XResult {
    id: string;
    url: string;
    title: string;
    author?: string;
    publishedDate?: string;
    text: string;
    highlights?: string[];
    tweetId: string;
    score?: number; // score from Exa
    highlightScores?: number[]; // highlightScores from Exa
}

// === Mapbox & Places Search Types ===
export interface MapboxFeature {
    // Renamed but kept for backward compatibility
    // Now represents OpenStreetMap feature structure
    id: string;
    name: string;
    formatted_address: string; // display_name in OSM
    geometry: {
        type: string;
        coordinates: number[]; // [lon, lat] in OSM
    };
    feature_type: string; // From OSM type/class
    context: string; // From address components
    coordinates: number[]; // [lon, lat] from center
    bbox: number[]; // From boundingbox
    source: string; // Will be 'openstreetmap'
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

// === Video Search Types ===
export interface VideoDetails {
    title?: string;
    author_name?: string;
    author_url?: string;
    thumbnail_url?: string;
    type?: string;
    provider_name?: string;
    provider_url?: string;
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

// === Web Search (Tavily) Types ===
export interface TavilySearchResult {
    url: string;
    title: string;
    content: string;
    raw_content?: string;
    published_date?: string;
}

export interface TavilyImageResult {
    url: string;
    description?: string;
}

export interface WebSearchContext {
    serverEnv: {
        TAVILY_API_KEY?: string;
    };
    dataStream: any;
}

export type MultiSearchArgs = {
    queries: string[];
    maxResults: number[];
    topics?: ("general" | "news" | "finance")[];
    searchDepth: ("basic" | "advanced")[];
    includeDomains?: string[];
    excludeDomains?: string[];
};

// === Exa Search Types ===
export interface ExaSearchResultItem {
    url: string;
    title?: string;
    text?: string;
    highlights?: string[];
    highlightScores?: number[];
    publishedDate?: string;
    author?: string;
    score?: number;
    // Potential other fields from Exa
    favicon?: string; // Added based on potential Exa fields
    images?: Array<string | { url: string, alt?: string, description?: string }>; // For image extraction logic
    [key: string]: any;
}

export interface ExaSearchContext {
    serverEnv: {
        EXA_API_KEY?: string;
    };
    dataStream: any;
}

// === Linkup Search Types ===
export interface LinkupSearchContext {
    serverEnv: any;
    dataStream: any;
}

// Specific Linkup result item structure (approximated)
export interface LinkupResultItem {
    type: 'text' | 'image' | string; // Can be other types
    url: string;
    title?: string;
    name?: string; // Often used instead of title
    content?: string;
    text?: string;
    raw_content?: string;
    published_date?: string;
    author?: string;
    score?: number;
    favicon?: string; // Added based on potential Linkup fields
    [key: string]: any; // Allow other fields
}

export type LinkupQueryCompletion = {
    type: 'linkup_query_completion';
    data: {
        query: string;
        index: number;
        total: number;
        status: 'completed' | 'error';
        outputType: 'sourcedAnswer' | 'searchResults' | 'structured';
        resultsCount: number;
        imagesCount: number;
        errorMessage?: string;
    };
};