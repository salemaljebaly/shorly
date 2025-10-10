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
    // First, check if we have user data in localStorage (from login)
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

    // If no stored data, fetch from API
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
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  return { user, loading, error };
}