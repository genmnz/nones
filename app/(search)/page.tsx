"use client";

import { Suspense } from 'react';
import { ChatInterface } from '@/components/chat-interface';
import { InstallPrompt } from '@/components/ui/InstallPrompt';
import { ClassicLoader } from '@/components/ui/loading';

const Home = () => {
    return (
        <Suspense fallback={<ClassicLoader size="sm" className="text-blue-600 dark:text-blue-300" />}>
            <ChatInterface  />
            <InstallPrompt />
        </Suspense>
    );
};

export default Home;