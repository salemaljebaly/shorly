import { apiClient } from './client';

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  bio?: string;
  location?: string;
  website?: string;
  timezone?: string;
  language?: string;
  emailNotifications?: boolean;
  analyticsTracking?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  name?: string;
  bio?: string;
  location?: string;
  website?: string;
  timezone?: string;
  language?: string;
  emailNotifications?: boolean;
  analyticsTracking?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface DeleteAccountRequest {
  password: string;
}

export const usersApi = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: UpdateProfileRequest): Promise<UserProfile> => {
    const response = await apiClient.patch('/users/profile', data);
    return response.data;
  },

  uploadAvatar: async (file: File): Promise<UserProfile> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post('/users/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    const response = await apiClient.post('/users/change-password', data);
    return response.data;
  },

  deleteAccount: async (data: DeleteAccountRequest): Promise<void> => {
    const response = await apiClient.delete('/users/account', {
      data: { password: data.password },
    });
    return response.data;
  },
};
