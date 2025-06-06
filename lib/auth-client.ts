import { createAuthClient } from "better-auth/react";
import { config } from 'dotenv';

config({
    path: '.env',
});

export const authClient = createAuthClient();
export const { signIn, signOut, signUp, useSession } = authClient;