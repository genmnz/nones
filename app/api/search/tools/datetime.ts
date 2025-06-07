import { z } from 'zod';

export const datetimeSchema = z.object({});

type Context = {
  timezone: string;
};

export async function executeDatetime(
  params: z.infer<typeof datetimeSchema>,
  context: Context,
) {
  const { timezone } = context;
  try {
    // Get the current UTC time
    const now = new Date();

    // Format date and time using the user's timezone
    return {
      timestamp: now.getTime(),
      iso: now.toISOString(),
      timezone: timezone,
      formatted: {
        date: new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: timezone
        }).format(now),
        time: new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: timezone
        }).format(now),
        dateShort: new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: timezone
        }).format(now),
        timeShort: new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: timezone
        }).format(now),
        // Add additional useful formats
        full: new Intl.DateTimeFormat('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: timezone
        }).format(now),
        iso_local: new Intl.DateTimeFormat('sv-SE', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZone: timezone
        }).format(now).replace(' ', 'T')
      }
    };
  } catch (error) {
    console.error('Datetime error:', error);
    throw error;
  }
}
