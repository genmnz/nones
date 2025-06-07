import { z } from 'zod';

export const weatherSchema = z.object({
  location: z.string().describe('The name of the location to get weather data for (e.g., "London", "New York", "Tokyo").')
});

export type WeatherParams = z.infer<typeof weatherSchema>;

// Define the context required by the execute function
interface WeatherContext {
  serverEnv: {
      OPENWEATHER_API_KEY?: string;
  };
}

export async function executeGetWeatherData(
  { location }: z.infer<typeof weatherSchema>,
  context: WeatherContext,
) {
  const { serverEnv } = context;
  const apiKey = serverEnv.OPENWEATHER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENWEATHER_API_KEY is not configured in server environment variables.");
  }
  
  try {
    // Log the location being searched
    console.log(`Searching for weather data for location: ${location}`);

    // Step 1: Geocode the location name using Open Meteo API
    const geocodingResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`
    );

    if (!geocodingResponse.ok) {
        throw new Error(`Geocoding API failed with status ${geocodingResponse.status}`);
    }

    const geocodingData = await geocodingResponse.json();

    if (!geocodingData.results || geocodingData.results.length === 0) {
      throw new Error(`Could not find location: '${location}'. Please try a different or more specific location.`);
    }

    const { latitude, longitude, name, country, timezone } = geocodingData.results[0];
    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);
    
    // Step 2: Fetch weather data using OpenWeather API with the obtained coordinates
    const [weatherResponse, airPollutionResponse, dailyForecastResponse] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
      ),
      fetch(
        `https://api.openweathermap.org/data/2.5/forecast/daily?lat=${latitude}&lon=${longitude}&cnt=16&appid=${apiKey}`
      )
    ]);

    for (const response of [weatherResponse, airPollutionResponse, dailyForecastResponse]) {
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`OpenWeather API request failed with status ${response.status}: ${errorData}`);
        }
    }

    const [weatherData, airPollutionData, dailyForecastData] = await Promise.all([
      weatherResponse.json(),
      airPollutionResponse.json(),
      dailyForecastResponse.json().catch(error => {
        console.error('Daily forecast API error:', error);
        return { list: [] }; // Return empty data if API fails
      })
    ]);

    // Step 3: Fetch air pollution forecast
    const airPollutionForecastResponse = await fetch(
      `https://api.openweathermap.org/data/2.5/air_pollution/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}`
    );

    if (!airPollutionForecastResponse.ok) {
        const errorData = await airPollutionForecastResponse.text();
        throw new Error(`OpenWeather air pollution forecast API request failed with status ${airPollutionForecastResponse.status}: ${errorData}`);
    }
    const airPollutionForecastData = await airPollutionForecastResponse.json();

    // Add geocoding information to the weather data
    return {
      ...weatherData,
      geocoding: {
        latitude,
        longitude,
        name,
        country,
        timezone
      },
      air_pollution: airPollutionData,
      air_pollution_forecast: airPollutionForecastData,
      daily_forecast: dailyForecastData
    };
  } catch (error) {
    console.error('OpenWeatherMap API error:', error);
    throw error;
  }
}
