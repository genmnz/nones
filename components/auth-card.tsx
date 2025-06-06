"use client"

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import Link from "next/link";

type AuthProvider = "github" | "google" | "twitter";

interface AuthIconProps extends React.ComponentProps<"svg"> {}

interface SignInButtonProps {
  title: string;
  provider: AuthProvider;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  callbackURL: string;
  icon: React.ReactNode;
}

interface AuthCardProps {
  title: string;
  description: string;
  mode?: "sign-in" | "sign-up";
}

/**
 * Authentication provider icons
 */
const AuthIcons = {
  Github: (props: AuthIconProps) => (
    <svg viewBox="0 0 438.549 438.549" {...props}>
      <path
        fill="currentColor"
        d="M409.132 114.573c-19.608-33.596-46.205-60.194-79.798-79.8-33.598-19.607-70.277-29.408-110.063-29.408-39.781 0-76.472 9.804-110.063 29.408-33.596 19.605-60.192 46.204-79.8 79.8C9.803 148.168 0 184.854 0 224.63c0 47.78 13.94 90.745 41.827 128.906 27.884 38.164 63.906 64.572 108.063 79.227 5.14.954 8.945.283 11.419-1.996 2.475-2.282 3.711-5.14 3.711-8.562 0-.571-.049-5.708-.144-15.417a2549.81 2549.81 0 01-.144-25.406l-6.567 1.136c-4.187.767-9.469 1.092-15.846 1-6.374-.089-12.991-.757-19.842-1.999-6.854-1.231-13.229-4.086-19.13-8.559-5.898-4.473-10.085-10.328-12.56-17.556l-2.855-6.57c-1.903-4.374-4.899-9.233-8.992-14.559-4.093-5.331-8.232-8.945-12.419-10.848l-1.999-1.431c-1.332-.951-2.568-2.098-3.711-3.429-1.142-1.331-1.997-2.663-2.568-3.997-.572-1.335-.098-2.43 1.427-3.289 1.525-.859 4.281-1.276 8.28-1.276l5.708.853c3.807.763 8.516 3.042 14.133 6.851 5.614 3.806 10.229 8.754 13.846 14.842 4.38 7.806 9.657 13.754 15.846 17.847 6.184 4.093 12.419 6.136 18.699 6.136 6.28 0 11.704-.476 16.274-1.423 4.565-.952 8.848-2.383 12.847-4.285 1.713-12.758 6.377-22.559 13.988-29.41-10.848-1.14-20.601-2.857-29.264-5.14-8.658-2.286-17.605-5.996-26.835-11.14-9.235-5.137-16.896-11.516-22.985-19.126-6.09-7.614-11.088-17.61-14.987-29.979-3.901-12.374-5.852-26.648-5.852-42.826 0-23.035 7.52-42.637 22.557-58.817-7.044-17.318-6.379-36.732 1.997-58.24 5.52-1.715 13.706-.428 24.554 3.853 10.85 4.283 18.794 7.952 23.84 10.994 5.046 3.041 9.089 5.618 12.135 7.708 17.705-4.947 35.976-7.421 54.818-7.421s37.117 2.474 54.823 7.421l10.849-6.849c7.419-4.57 16.18-8.758 26.262-12.565 10.088-3.805 17.802-4.853 23.134-3.138 8.562 21.509 9.325 40.922 2.279 58.24 15.036 16.18 22.559 35.787 22.559 58.817 0 16.178-1.958 30.497-5.853 42.966-3.9 12.471-8.941 22.457-15.125 29.979-6.191 7.521-13.901 13.85-23.131 18.986-9.232 5.14-18.182 8.85-26.84 11.136-8.662 2.286-18.415 4.004-29.263 5.146 9.894 8.562 14.842 22.077 14.842 40.539v60.237c0 3.422 1.19 6.279 3.572 8.562 2.379 2.279 6.136 2.95 11.276 1.995 44.163-14.653 80.185-41.062 108.068-79.226 27.88-38.161 41.825-81.126 41.825-128.906-.01-39.771-9.818-76.454-29.414-110.049z"
      ></path>
    </svg>
  ),
  Google: (props: AuthIconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
  ),
  Twitter: (props: AuthIconProps) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      {...props}
    >
      <path
        fill="currentColor"
        d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
      ></path>
    </svg>
  ),
};

/**
 * Button component for social authentication providers
 */
const SignInButton = ({
  title,
  provider,
  loading,
  setLoading,
  callbackURL,
  icon,
}: SignInButtonProps) => (
  <Button
    variant="outline"
    className={cn(
      "w-full py-2 gap-2 bg-transparent border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900", 
      "transition-all text-sm h-10"
    )}
    disabled={loading}
    onClick={async () => {
      await signIn.social(
        {
          provider,
          callbackURL
        },
        {
          onRequest: () => {
            setLoading(true);
          },
        },
      );
    }}
  >
    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
    <span>{title}</span>
  </Button>
);

/**
 * Authentication component with social provider options
 */
export default function AuthCard({
  title,
  description,
  mode = "sign-in",
}: AuthCardProps) {
  const [githubLoading, setGithubLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);

  return (
    <div className="max-w-sm w-full">
      <div className="px-4 py-6">
        <h2 className="text-lg mb-1">{title}</h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">{description}</p>
        
        <div className="space-y-2 mb-4">
          {/* Commenting out GitHub and Twitter sign-in buttons for now */}
          {/* <SignInButton
            title="GitHub"
            provider="github"
            loading={githubLoading}
            setLoading={setGithubLoading}
            callbackURL="/"
            icon={<AuthIcons.Github className="w-3.5 h-3.5" />}
          /> */}
          <SignInButton
            title="Google"
            provider="google"
            loading={googleLoading}
            setLoading={setGoogleLoading}
            callbackURL="/"
            icon={<AuthIcons.Google className="w-3.5 h-3.5" />}
          />
          {/* <SignInButton
            title="X (Twitter)"
            provider="twitter"
            loading={twitterLoading}
            setLoading={setTwitterLoading}
            callbackURL="/"
            icon={<AuthIcons.Twitter className="w-3.5 h-3.5" />}
          /> */}
        </div>
        
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6">
          By continuing, you agree to our <Link href="/terms" className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300">Terms of Service</Link> and <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-neutral-600 dark:hover:text-neutral-300">Privacy Policy</Link>.
        </p>
        
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {mode === "sign-in" ? (
              <>
                Don&apos;t have an account?{" "}
                <Link href="/sign-up" className="text-black dark:text-white hover:underline">
                  Sign up
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/sign-in" className="text-black dark:text-white hover:underline">
                  Sign in
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}