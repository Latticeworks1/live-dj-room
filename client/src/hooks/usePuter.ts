import { useState, useEffect } from 'react';

// Declare Puter global type
declare global {
  interface Window {
    puter?: {
      auth: {
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        signOut: () => Promise<void>;
        getUser: () => Promise<{ username: string }>;
      };
    };
  }
}

export const usePuter = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);

  useEffect(() => {
    const checkPuterAuth = async () => {
      // Wait for Puter SDK to load
      const maxAttempts = 50; // 5 seconds
      let attempts = 0;

      while (!window.puter && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.puter) {
        console.error('[Puter] SDK not loaded after 5 seconds');
        setIsLoading(false);
        return;
      }

      try {
        const signedIn = await window.puter.auth.isSignedIn();
        setIsSignedIn(signedIn);

        if (signedIn) {
          const userData = await window.puter.auth.getUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('[Puter] Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkPuterAuth();
  }, []);

  const signIn = async () => {
    if (!window.puter) {
      console.error('[Puter] SDK not available');
      return;
    }
    await window.puter.auth.signIn();
  };

  const signOut = async () => {
    if (!window.puter) {
      console.error('[Puter] SDK not available');
      return;
    }
    await window.puter.auth.signOut();
    setIsSignedIn(false);
    setUser(null);
  };

  return {
    isLoading,
    isSignedIn,
    user,
    signIn,
    signOut,
  };
};
