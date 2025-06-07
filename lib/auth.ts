import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { config } from 'dotenv';
import { serverEnv } from "@/env/server";

config({
    path: '.env',
});

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: "pg",
    }),
    socialProviders: {
        // github: {
        //     clientId: serverEnv.GITHUB_CLIENT_ID,
        //     clientSecret: serverEnv.GITHUB_CLIENT_SECRET,
        // },
        google: { 
            clientId: serverEnv.GOOGLE_CLIENT_ID, 
            clientSecret: serverEnv.GOOGLE_CLIENT_SECRET, 
        },
        // twitter: { 
        //     clientId: serverEnv.TWITTER_CLIENT_ID, 
        //     clientSecret: serverEnv.TWITTER_CLIENT_SECRET, 
        // },
    },
    plugins: [nextCookies()],
    trustedOrigins: ["http://localhost:3000", "https://mind.ai", "https://www.mind.ai", "https://super-winner-v6vwvrp9wr9f66ww-3000.app.github.dev",

        // Dynamically add origins from the ALLOWED_ORIGINS environment variable
        ...(serverEnv.ALLOWED_ORIGINS 
            ? serverEnv.ALLOWED_ORIGINS.split(',')
                .map(origin => origin.trim()) // Trim whitespace from each origin
                .filter(origin => origin.length > 0) // Filter out any empty strings
            : [])
    ].filter((value, index, self) => self.indexOf(value) === index),
        
    
});