"use client";

import { Suspense } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { InstallPrompt } from '@/components/InstallPrompt';

const Home = () => {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ChatInterface  />
            <InstallPrompt />
        </Suspense>
    );
};

export default Home;