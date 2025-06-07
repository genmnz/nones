import { z } from 'zod';

export const trackFlightSchema = z.object({
  flight_number: z.string().describe('The flight number to track'),
});

export type TrackFlightParams = z.infer<typeof trackFlightSchema>;

interface TrackFlightContext {
  serverEnv: { AVIATION_STACK_API_KEY?: string; };
}

export async function executeTrackFlight(

  { flight_number }: z.infer<typeof trackFlightSchema>,
  { serverEnv }: TrackFlightContext,

): Promise<any> {
  const apiKey = serverEnv.AVIATION_STACK_API_KEY;
  if (!apiKey) throw new Error("AVIATION_STACK_API_KEY is not configured in server environment variables.");

  // Basic validation for IATA format (e.g., 2 letters + 1-4 digits)
  const iataRegex = /^[A-Z0-9]{2}\d{1,4}$/i;
  if (!iataRegex.test(flight_number)) {
    console.warn(`Invalid flight number format provided: ${flight_number}. Expected IATA format (e.g., AA123).`);
    return { error: `Invalid flight number format: ${flight_number}. Please provide IATA format (e.g., AA123).` };
  }


  try {
    console.log('Flight Number:', flight_number);
    const response = await fetch(
      // `https://api.aviationstack.com/v1/flights?access_key=${serverEnv.AVIATION_STACK_API_KEY}&flight_iata=${flight_number}`,
      `https://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flight_number.toUpperCase()}`, // Ensure uppercase
    );

    if (!response.ok) {
      console.error(`AviationStack request failed: ${response.status} ${response.statusText}`);
      const errorBody = await response.text();
      console.error(`AviationStack error body: ${errorBody}`);
      return { error: `AviationStack request failed with status ${response.status}` };
    }

    const data = await response.json();
    // Check if the API returned an error structure within the JSON
    if (data.error) {
      console.error('AviationStack API returned an error:', data.error);
      return { error: data.error.message || 'AviationStack API error' };
    }
    // return data;
    return await response.json();
  } catch (error) {
    console.error('Flight tracking error:', error);
    throw error;
  }
}
