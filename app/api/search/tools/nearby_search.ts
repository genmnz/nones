import { z } from 'zod';

export const nearbyPlacesSearchSchema = z.object({
    location: z.string().optional().describe('The location name to search around (e.g., "Eiffel Tower"). Geocoded using Nominatim.'),
    latitude: z.number().optional().describe('Latitude of the search center. Required if location is not provided.'),
    longitude: z.number().optional().describe('Longitude of the search center. Required if location is not provided.'),
    type: z.string().describe('Type of place to search for (e.g., "restaurant", "hotel", "museum"). This corresponds to OpenStreetMap tags like amenity, shop, tourism.'),
    radius: z.number().default(1000).describe('Search radius in meters (default 1000m).'),
    keyword: z.string().optional().describe('Additional keyword to filter results by name.'),
}).refine(data => data.location || (data.latitude !== undefined && data.longitude !== undefined), {
    message: "Either 'location' or both 'latitude' and 'longitude' must be provided.",
});

export type NearbyPlacesSearchParams = z.infer<typeof nearbyPlacesSearchSchema>;

// No Google API Key needed
interface NearbySearchContext {
    serverEnv?: Record<string, any>;
}

// Function to calculate distance (Haversine formula)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

export async function executeNearbyPlacesSearch(
    params: NearbyPlacesSearchParams,
    context: NearbySearchContext // No google API key in context
) {
    try {
        let { location, latitude, longitude, type, radius, keyword } = params;

        // 1. Geocode location if coordinates are not provided
        if (latitude === undefined || longitude === undefined) {
            if (!location) {
                throw new Error("Either location or coordinates must be provided.");
            }
            const userAgent = 'GeminiCodeAssist/1.0 (your-app-info)';
            const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
            const geocodeResponse = await fetch(nominatimUrl, { headers: { 'User-Agent': userAgent } });

            if (!geocodeResponse.ok) {
                throw new Error(`Could not geocode location: ${location}. Nominatim API error: ${geocodeResponse.statusText}`);
            }
            const geocodeData = await geocodeResponse.json();
            if (!geocodeData || geocodeData.length === 0) {
                return { success: false, error: `No results found for location: ${location}`, places: [] };
            }
            latitude = parseFloat(geocodeData[0].lat);
            longitude = parseFloat(geocodeData[0].lon);
        }

        // 2. Construct Overpass API Query
        const tagKeys = ['amenity', 'shop', 'tourism', 'leisure', 'historic', 'natural'];
        const keywordFilter = keyword ? `[~"name"~"${keyword}",i]` : '';

        const queries = tagKeys.map(key => `
            node[${key}="${type}"]${keywordFilter}(around:${radius},${latitude},${longitude});
            way[${key}="${type}"]${keywordFilter}(around:${radius},${latitude},${longitude});
            relation[${key}="${type}"]${keywordFilter}(around:${radius},${latitude},${longitude});
        `).join('');

        const overpassQuery = `
            [out:json][timeout:25];
            (
                ${queries}
            );
            out center;
        `;

        // 3. Call Overpass API
        const overpassUrl = 'https://overpass-api.de/api/interpreter';
        const overpassResponse = await fetch(overpassUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `data=${encodeURIComponent(overpassQuery)}`
        });

        if (!overpassResponse.ok) {
            throw new Error(`Overpass API error: ${overpassResponse.statusText}`);
        }
        const overpassData = await overpassResponse.json();

        // 4. Process results
        const places = overpassData.elements.map((element: any) => {
            const centerLat = element.center?.lat ?? element.lat;
            const centerLon = element.center?.lon ?? element.lon;
            const distance = calculateDistance(latitude!, longitude!, centerLat, centerLon);

            return {
                place_id: `${element.type}/${element.id}`,
                name: element.tags?.name || 'N/A',
                formatted_address: element.tags?.['addr:full'] || element.tags?.['addr:street'] || 'Address not available',
                location: {
                    lat: centerLat,
                    lng: centerLon,
                },
                tags: element.tags,
                types: Object.keys(element.tags).filter(k => tagKeys.includes(k)),
                distance: Math.round(distance),
                source: 'openstreetmap_overpass'
            };
        });

        // 5. Sort by distance
        const sortedPlaces = places.sort((a: { distance: number; }, b: { distance: number; }) => a.distance - b.distance);

        return {
            success: true,
            query: location || `${latitude},${longitude}`,
            type,
            center: { lat: latitude, lng: longitude },
            places: sortedPlaces,
            count: sortedPlaces.length
        };

    } catch (error) {
        console.error('Nearby search error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown nearby search error',
            places: [],
            center: params.latitude && params.longitude ? { lat: params.latitude, lng: params.longitude } : null
        };
    }
}
  