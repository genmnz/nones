import { z } from 'zod';

export const findPlaceOnMapSchema = z.object({
  query: z.string().optional().describe('Address or place name to search for (for forward geocoding)'),
  latitude: z.number().optional().describe('Latitude for reverse geocoding'),
  longitude: z.number().optional().describe('Longitude for reverse geocoding'),
});

export type FindPlaceOnMapParams = z.infer<typeof findPlaceOnMapSchema>;

export const nearbyPlacesSearchSchema = z.object({
  location: z.string().describe('The location name or coordinates to search around'),
  latitude: z.number().optional().describe('Latitude of the search center'),
  longitude: z.number().optional().describe('Longitude of the search center'),
  type: z.string().describe('Type of place to search for (restaurant, lodging, tourist_attraction, gas_station, bank, hospital, etc.) from the new google places api'),
  radius: z.number().describe('Search radius in meters (max 50000)'),
  keyword: z.string().optional().describe('Additional keyword to filter results'),
});

export type NearbyPlacesSearchParams = z.infer<typeof nearbyPlacesSearchSchema>;

interface MapsContext {
  serverEnv: {
    GOOGLE_MAPS_API_KEY?: string;
  };
}

export async function executeFindPlaceOnMap(
  { query, latitude, longitude }: FindPlaceOnMapParams,
  context: MapsContext,
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

export async function executeNearbyPlacesSearch(
  {
    location,
    latitude,
    longitude,
    type,
    radius,
    keyword
  }: NearbyPlacesSearchParams,
  context: MapsContext,
) {
  const { serverEnv } = context;
  try {
    const googleApiKey = serverEnv.GOOGLE_MAPS_API_KEY;
    
    if (!googleApiKey) {
      throw new Error('Google Maps API key not configured');
    }

    let searchLat = latitude;
    let searchLng = longitude;

    // If coordinates not provided, geocode the location using OSM Nominatim
    if (searchLat === undefined || searchLng === undefined) {
      const userAgent = 'GeminiCodeAssist/1.0 (Please update with your app details)'; // IMPORTANT: Update User-Agent
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&addressdetails=1`;
      const geocodeResponse = await fetch(nominatimUrl, { headers: { 'User-Agent': userAgent } });
      
      let geocodeData: any;
      try {
        geocodeData = await geocodeResponse.json();
      } catch (e) {
        if (!geocodeResponse.ok) {
            return {
              success: false,
              error: `Could not geocode location: ${location}. Nominatim request failed: ${geocodeResponse.status} ${geocodeResponse.statusText}`,
              places: [],
              center: null
            };
        }
        console.error('Nominatim geocoding error: Response was OK but not valid JSON.', e);
        return {
            success: false,
            error: `Could not geocode location: ${location}. Invalid response from Nominatim.`,
            places: [],
            center: null
        };
      }

      if (!geocodeResponse.ok || !Array.isArray(geocodeData) || geocodeData.length === 0) {
        const errorDetail = geocodeData?.error || (geocodeResponse.ok ? "No results found" : `HTTP ${geocodeResponse.status}`);
        return {
          success: false,
          error: `Could not geocode location: ${location}. Nominatim error: ${errorDetail}`,
          places: [],
          center: null
        };
      }
      
      const firstResult = geocodeData[0];
      searchLat = parseFloat(firstResult.lat);
      searchLng = parseFloat(firstResult.lon);
      if (isNaN(searchLat) || isNaN(searchLng)) {
        return { success: false, error: `Could not parse coordinates from geocoded location: ${location}`, places: [], center: null };
      } else {
        return { success: false, error: `Could not parse coordinates from geocoded location: ${location}`, places: [], center: null };
      }
    }

    // Build nearby search URL
    let nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchLat},${searchLng}&radius=${Math.min(radius, 50000)}&type=${type}&key=${googleApiKey}`;
    
    if (keyword) {
      nearbyUrl += `&keyword=${encodeURIComponent(keyword)}`;
    }

    const response = await fetch(nearbyUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      return {
        success: false,
        error: data.error_message || `Nearby search failed: ${data.status}`,
        places: [],
        center: { lat: searchLat, lng: searchLng }
      };
    }

    // Get detailed information for each place
    const detailedPlaces = await Promise.all(
      data.results.slice(0, 20).map(async (place: any) => {
        try {
          // Get place details for additional information
          const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,reviews,opening_hours,photos,price_level,types&key=${googleApiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          const details = await detailsResponse.json();

          let detailsData = details.status === 'OK' ? details.result : {};

          // Calculate distance from search center
          const lat1 = searchLat!;
          const lon1 = searchLng!;
          const lat2 = place.geometry.location.lat;
          const lon2 = place.geometry.location.lng;
          
          const R = 6371000; // Earth's radius in meters
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          const distance = R * c;

          // Convert Google's price_level to text representation
          const formatPriceLevel = (priceLevel: number | undefined): string => {
            if (priceLevel === undefined || priceLevel === null) return 'Not Available';
            switch (priceLevel) {
              case 0: return 'Free';
              case 1: return 'Inexpensive';
              case 2: return 'Moderate';
              case 3: return 'Expensive';
              case 4: return 'Very Expensive';
              default: return 'Not Available';
            }
          };

          return {
            place_id: place.place_id,
            name: place.name,
            formatted_address: detailsData.formatted_address || place.vicinity,
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
            rating: place.rating || detailsData.rating,
            price_level: formatPriceLevel(place.price_level || detailsData.price_level),
            types: place.types,
            distance: Math.round(distance),
            is_open: place.opening_hours?.open_now,
            photos: (detailsData.photos || place.photos)?.slice(0, 3).map((photo: any) => ({
              photo_reference: photo.photo_reference,
              width: photo.width,
              height: photo.height,
              url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${googleApiKey}`
            })) || [],
            phone: detailsData.formatted_phone_number,
            website: detailsData.website,
            opening_hours: detailsData.opening_hours?.weekday_text || [],
            reviews_count: detailsData.reviews?.length || 0,
            source: 'google_places'
          };
        } catch (error) {
          console.error(`Failed to get details for place ${place.name}:`, error);
          
          // Convert Google's price_level to text representation (same function as above)
          const formatPriceLevel = (priceLevel: number | undefined): string => {
            if (priceLevel === undefined || priceLevel === null) return 'Not Available';
            switch (priceLevel) {
              case 0: return 'Free';
              case 1: return 'Inexpensive';
              case 2: return 'Moderate';
              case 3: return 'Expensive';
              case 4: return 'Very Expensive';
              default: return 'Not Available';
            }
          };
          
          // Return basic place info if details fail
          return {
            place_id: place.place_id,
            name: place.name,
            formatted_address: place.vicinity,
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng,
            },
            rating: place.rating,
            price_level: formatPriceLevel(place.price_level),
            types: place.types,
            distance: 0,
            source: 'google_places'
          };
        }
      })
    );

    // Sort by distance
    const sortedPlaces = detailedPlaces.sort((a, b) => (a.distance || 0) - (b.distance || 0));

    return {
      success: true,
      query: location,
      type,
      center: { lat: searchLat, lng: searchLng },
      places: sortedPlaces,
      count: sortedPlaces.length
    };
  } catch (error) {
    console.log('Nearby search error:', error);
    console.error('Nearby search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown nearby search error',
      places: [],
      center: latitude && longitude ? { lat: latitude, lng: longitude } : null
    };
  }
}
