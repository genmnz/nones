"use client";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between h-screen w-full h-full flex flex-col items-center justify-center px-2 md:px-0">
                {children}
        </div>
    );
}