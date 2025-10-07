import { apiClient } from './client';

export interface QRCodeOptions {
  size?: number;
  format?: 'png' | 'svg';
  download?: boolean;
  dark?: string;
  light?: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  utm_source?: string;
  utm_medium?: string;
}

export interface BatchQRRequest {
  shortCodes: string[];
  format?: string;
  size?: number;
}

export interface BatchQRResponse {
  shortCode: string;
  qrCode: string; // base64
}

export const qrApi = {
  generateLinkQR: async (shortCode: string, options?: QRCodeOptions): Promise<Blob> => {
    const response = await apiClient.get(`/qr/link/${shortCode}`, {
      params: options,
      responseType: 'blob',
    });
    return response.data;
  },

  generateOneLinkQR: async (shortCode: string, options?: QRCodeOptions): Promise<Blob> => {
    const response = await apiClient.get(`/qr/onelink/${shortCode}`, {
      params: options,
      responseType: 'blob',
    });
    return response.data;
  },

  generateBatchQR: async (data: BatchQRRequest): Promise<BatchQRResponse[]> => {
    const response = await apiClient.post('/qr/batch', data);
    return response.data;
  },
};
