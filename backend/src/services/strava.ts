import axios from 'axios';
import type { StravaTokenResponse, StravaActivity } from '../types/index.js';

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

export class StravaService {
  private get clientId(): string {
    return process.env.STRAVA_CLIENT_ID || '';
  }

  private get clientSecret(): string {
    return process.env.STRAVA_CLIENT_SECRET || '';
  }

  private get redirectUri(): string {
    return process.env.STRAVA_REDIRECT_URI || '';
  }

  getAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'activity:read',
      approval_prompt: 'force',
    });
    return `https://www.strava.com/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<StravaTokenResponse> {
    const response = await axios.post<StravaTokenResponse>(
      'https://www.strava.com/oauth/token',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }
    );
    return response.data;
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await axios.post<StravaTokenResponse>(
      'https://www.strava.com/oauth/token',
      {
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }
    );
    return response.data;
  }

  async getActivities(
    accessToken: string,
    after?: number
  ): Promise<StravaActivity[]> {
    const params: Record<string, string> = {
      per_page: '200',
    };
    if (after) {
      params.after = after.toString();
    }

    const response = await axios.get<StravaActivity[]>(
      `${STRAVA_API_BASE}/athlete/activities`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params,
      }
    );
    return response.data;
  }

  async getAllActivities(accessToken: string, after?: number): Promise<StravaActivity[]> {
    const allActivities: StravaActivity[] = [];
    let page = 1;
    const perPage = 200;

    while (true) {
      const params: Record<string, string> = {
        per_page: perPage.toString(),
        page: page.toString(),
      };
      if (after) {
        params.after = after.toString();
      }

      const response = await axios.get<StravaActivity[]>(
        `${STRAVA_API_BASE}/athlete/activities`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params,
        }
      );

      const activities = response.data;
      if (activities.length === 0) break;

      allActivities.push(...activities);
      page++;

      // Strava API limits to 200 activities per request
      if (activities.length < perPage) break;
    }

    return allActivities;
  }
}

