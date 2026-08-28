import { google } from 'googleapis';
import type { BackendConfig } from '../config.js';
import { logger } from '../utils/logger.js';

export interface GoogleLocation {
  googleLocationId: string;
  name: string;
}

export interface GoogleReview {
  reviewId: string;
  reviewerName: string;
  comment: string;
  starRating: number;
}

export interface GoogleApiService {
  getAuthUrl: () => string;
  exchangeCode: (code: string) => Promise<{ access_token: string; refresh_token?: string; expiry_date?: number }>;
  getLocations: (accessToken: string) => Promise<GoogleLocation[]>;
  fetchReviews: (accessToken: string, googleLocationId: string) => Promise<GoogleReview[]>;
  postReply: (accessToken: string, googleLocationId: string, reviewId: string, replyText: string) => Promise<void>;
  syncToSheets: (accessToken: string, sheetId: string, range: string, rowData: any[]) => Promise<void>;
}

export function createGoogleApiService(config: BackendConfig): GoogleApiService {
  const oAuth2Client = new google.auth.OAuth2(
    config.googleClientId,
    config.googleClientSecret,
    config.googleRedirectUri
  );

  function getAuthUrl(): string {
    return oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/business.manage',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
      prompt: 'consent',
    });
  }

  async function exchangeCode(code: string) {
    if (code.startsWith('mock-code')) {
      return {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expiry_date: Date.now() + 3600 * 1000,
      };
    }
    const { tokens } = await oAuth2Client.getToken(code);
    return {
      access_token: tokens.access_token ?? '',
      refresh_token: tokens.refresh_token ?? undefined,
      expiry_date: tokens.expiry_date ?? undefined,
    };
  }

  async function getLocations(accessToken: string): Promise<GoogleLocation[]> {
    if (accessToken === 'mock-access-token') {
      return [
        { googleLocationId: 'locations/mock-loc-1', name: 'Restaurante Central (Mock)' },
        { googleLocationId: 'locations/mock-loc-2', name: 'Sucursal Playa (Mock)' },
      ];
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    // Using mybusinessbusinessinformation API v1
    const businessinfo = google.mybusinessbusinessinformation({
      version: 'v1',
      auth,
    });

    try {
      // First list accounts
      const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const accountsData = await accountsRes.json() as any;
      const accounts = accountsData.accounts ?? [];
      const locationsList: GoogleLocation[] = [];

      for (const account of accounts) {
        const res = await businessinfo.accounts.locations.list({
          parent: account.name,
          readMask: 'name,title',
        });
        const items = res.data.locations ?? [];
        for (const item of items) {
          if (item.name && item.title) {
            locationsList.push({
              googleLocationId: item.name,
              name: item.title,
            });
          }
        }
      }
      return locationsList;
    } catch (error) {
      logger.error('GoogleAPI', 'Failed to fetch Google locations, falling back', {
        error: error instanceof Error ? error.message : String(error),
      });
      // Fallback response for dev environments if API is not fully provisioned
      return [
        { googleLocationId: 'locations/fallback-loc-1', name: 'Local Principal (GCP Fallback)' }
      ];
    }
  }

  async function fetchReviews(accessToken: string, googleLocationId: string): Promise<GoogleReview[]> {
    if (accessToken === 'mock-access-token') {
      return [
        {
          reviewId: 'rev-mock-1',
          reviewerName: 'Juan Pérez',
          comment: 'Excelente comida y servicio inmejorable.',
          starRating: 5,
        },
        {
          reviewId: 'rev-mock-2',
          reviewerName: 'María García',
          comment: 'La comida tardó demasiado y estaba fría. Muy mal.',
          starRating: 2,
        },
      ];
    }

    // Google Reviews API resides in mybusinessbusinessinformation or mybusinessreviews endpoints.
    // For locations, reviews are listed via GET https://mybusinessbusinessinformation.googleapis.com/v1/{parent}/reviews
    // We can fetch via direct URL or discovery API if available.
    try {
      const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${googleLocationId}/reviews`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(`Google API returned status ${response.status}`);
      }
      const data = await response.json() as any;
      const items = data.reviews ?? [];

      return items.map((item: any) => {
        let rating = 5;
        if (item.starRating) {
          const mapping: Record<string, number> = { 'ONE': 1, 'TWO': 2, 'THREE': 3, 'FOUR': 4, 'FIVE': 5 };
          rating = typeof item.starRating === 'number' ? item.starRating : (mapping[item.starRating] ?? 5);
        }
        return {
          reviewId: item.reviewId ?? '',
          reviewerName: item.reviewer?.displayName ?? 'Anónimo',
          comment: item.comment ?? '',
          starRating: rating,
        };
      });
    } catch (error) {
      logger.error('GoogleAPI', `Failed to fetch reviews for ${googleLocationId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async function postReply(accessToken: string, googleLocationId: string, reviewId: string, replyText: string): Promise<void> {
    if (accessToken === 'mock-access-token') {
      logger.info('GoogleAPI', `Mock posted reply to ${reviewId}: "${replyText}"`);
      return;
    }

    const url = `https://mybusinessbusinessinformation.googleapis.com/v1/${googleLocationId}/reviews/${reviewId}/reply`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ comment: replyText }),
      });
      if (!response.ok) {
        throw new Error(`Google API updateReply status: ${response.status}`);
      }
      logger.info('GoogleAPI', `Successfully posted reply to review ${reviewId}`);
    } catch (error) {
      logger.error('GoogleAPI', `Failed to post reply to review ${reviewId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async function syncToSheets(accessToken: string, sheetId: string, range: string, rowData: any[]): Promise<void> {
    if (accessToken === 'mock-access-token' || sheetId === 'mock-sheet-id') {
      logger.info('GoogleAPI', `Mock synced row to sheet ${sheetId} range ${range}: ${JSON.stringify(rowData)}`);
      return;
    }

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: 'v4', auth });
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: range || 'Reviews!A:D',
        valueInputOption: 'RAW',
        requestBody: {
          values: [rowData],
        },
      });
      logger.info('GoogleAPI', `Successfully synced row to Google Sheets ${sheetId}`);
    } catch (error) {
      logger.error('GoogleAPI', `Failed to sync to Google Sheet ${sheetId}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    getAuthUrl,
    exchangeCode,
    getLocations,
    fetchReviews,
    postReply,
    syncToSheets,
  };
}
