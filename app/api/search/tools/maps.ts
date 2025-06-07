import { z } from 'zod';

export const findPlaceOnMapSchema = z.object({
  query: z.string().optional().describe('Address or place name to search for (for forward geocoding)'),
  latitude: z.number().optional().describe('Latitude for reverse geocoding'),
  longitude: z.number().optional().describe('Longitude for reverse geocoding'),
});

export type FindPlaceOnMapParams = z.infer<typeof findPlaceOnMapSchema>;


export async function executeFindPlaceOnMap(
  { query, latitude, longitude }: FindPlaceOnMapParams,
  { serverEnv }: { serverEnv: Record<string, any>; },
) {
  try {
    let url: string;
    let searchType: 'forward' | 'reverse';
    const nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
    // addressdetails=1 includes a breakdown of the address into components.
    // limit=10 for forward search to get a few options.
    const commonParams = 'format=json&addressdetails=1';
    const userAgent = 'GeminiCodeAssist/1.0 (Please update with your app details)'; // IMPORTANT: Update User-Agent

    // Determine search type and build URL
    if (query) {
      // Forward geocoding
      url = `${nominatimBaseUrl}/search?q=${encodeURIComponent(query)}&${commonParams}&limit=10`;
      searchType = 'forward';
    } else if (latitude !== undefined && longitude !== undefined) {
      // Reverse geocoding with Nominatim
      url = `${nominatimBaseUrl}/reverse?lat=${latitude}&lon=${longitude}&${commonParams}`;
      searchType = 'reverse';
    } else {
      throw new Error('Either query or coordinates (latitude/longitude) must be provided');
    }

    const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
    
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      if (!response.ok) {
        return {
          success: false,
          error: `Geocoding request failed: ${response.status} ${response.statusText}`,
          places: []
        };
      }
      console.error('Geocoding error: Response was OK but not valid JSON.', e);
      return {
        success: false,
        error: 'Geocoding error: Invalid response format from server.',
        places: []
      };
    }

    if (!response.ok) {
      // Nominatim might return an error object, e.g., { error: "Unable to geocode" }
      const errorMsg = data?.error || `Geocoding failed: ${response.status} ${response.statusText}`;
      return {
        success: false,
        error: errorMsg,
        places: []
      };
    }

    let results: any[];
    if (searchType === 'forward') {
      // Nominatim search returns an array of results
      results = Array.isArray(data) ? data : [];
    } else {
      // Nominatim reverse returns a single object result
      results = data && typeof data === 'object' && !Array.isArray(data) && data.place_id ? [data] : [];
    }

    const places = results.map((osmResult: any) => {
      const name = osmResult.name || osmResult.display_name?.split(',')[0].trim() || 'Unknown name';
      const boundingbox = osmResult.boundingbox; // [south, north, west, east] (strings)
      let viewport;
      if (boundingbox && boundingbox.length === 4) {
        try {
          viewport = {
            southwest: { lat: parseFloat(boundingbox[0]), lng: parseFloat(boundingbox[2]) },
            northeast: { lat: parseFloat(boundingbox[1]), lng: parseFloat(boundingbox[3]) }
          };
        } catch (e) { viewport = undefined; }
      }
      return {
        place_id: String(osmResult.place_id),
        name: name,
        formatted_address: osmResult.display_name,
        location: { lat: parseFloat(osmResult.lat), lng: parseFloat(osmResult.lon) },
        types: [osmResult.class, osmResult.type].filter(Boolean), // OSM types (e.g., class, type)
        address_components: osmResult.address || {}, // OSM address components (object)
        viewport: viewport,
        source: 'osm_nominatim'
      };
    });

    return {
      success: true,
      search_type: searchType,
      query: query || `${latitude},${longitude}`,
      places,
      count: places.length
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown geocoding error',
      places: []
    };
  }
}
