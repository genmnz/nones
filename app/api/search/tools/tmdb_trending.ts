import { z } from 'zod';
import { serverEnv } from '@/env/server';

export const trendingMoviesSchema = z.object({});
export const trendingTvSchema = z.object({});

type Context = {
  serverEnv: typeof serverEnv;
};

export async function executeTrendingMovies(
  params: z.infer<typeof trendingMoviesSchema>,
  context: Context,
) {
  const { serverEnv } = context;
  const TMDB_API_KEY = serverEnv.TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

  try {
    const response = await fetch(`${TMDB_BASE_URL}/trending/movie/day?language=en-US`, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TMDB API error for trending movies: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.results) {
        console.warn('No results found for trending movies, TMDB response:', data);
        return { results: [] };
    }

    const results = data.results.map((movie: any) => ({
      ...movie,
      poster_path: movie.poster_path
        ? `https://image.tmdb.org/t/p/original${movie.poster_path}`
        : null,
      backdrop_path: movie.backdrop_path
        ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}`
        : null,
    }));

    return { results };
  } catch (error) {
    console.error('Trending movies error:', error);
    throw error;
  }
}

export async function executeTrendingTv(
  params: z.infer<typeof trendingTvSchema>,
  context: Context,
) {
  const { serverEnv } = context;
  const TMDB_API_KEY = serverEnv.TMDB_API_KEY;
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

  try {
    const response = await fetch(`${TMDB_BASE_URL}/trending/tv/day?language=en-US`, {
      headers: {
        Authorization: `Bearer ${TMDB_API_KEY}`,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TMDB API error for trending tv shows: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.results) {
        console.warn('No results found for trending TV shows, TMDB response:', data);
        return { results: [] };
    }

    const results = data.results.map((show: any) => ({
      ...show,
      poster_path: show.poster_path
        ? `https://image.tmdb.org/t/p/original${show.poster_path}`
        : null,
      backdrop_path: show.backdrop_path
        ? `https://image.tmdb.org/t/p/original${show.backdrop_path}`
        : null,
    }));

    return { results };
  } catch (error) {
    console.error('Trending TV shows error:', error);
    throw error;
  }
}
