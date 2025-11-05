'use client';

import { useState, useEffect } from 'react';
import { authApi } from '@/lib/api';

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar?: string | null;
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have valid tokens
    const accessToken = localStorage.getItem('access_token');

    // If no access token, user is not authenticated
    if (!accessToken) {
      console.log('No access token found - user not authenticated');
      setUser(null);
      setLoading(false);
      return;
    }

    // Check if we have cached user data (only if tokens exist)
    const storedUserData = localStorage.getItem('user_data');
    if (storedUserData) {
      try {
        const parsedUser = JSON.parse(storedUserData);
        console.log('Using stored user data:', parsedUser);
        setUser(parsedUser);
        setLoading(false);
        return;
      } catch (err) {
        console.error('Failed to parse stored user data:', err);
        localStorage.removeItem('user_data');
      }
    }

    // If no cached data, fetch from API
    const fetchCurrentUser = async () => {
      try {
        console.log('Fetching current user from API...');
        const userData = await authApi.getCurrentUser();
        console.log('Current user data from API:', userData);
        setUser(userData);

        // Store user data for future use
        localStorage.setItem('user_data', JSON.stringify(userData));
      } catch (err: any) {
        console.error('Failed to fetch current user:', err);
        setError(err.message || 'Failed to fetch user');
        // Clear tokens if fetch fails (likely invalid/expired token)
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user_data');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { user, loading, error };
}