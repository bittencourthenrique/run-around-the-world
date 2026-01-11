import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { City } from '../types/index.js';

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const MAJOR_CITIES_FILE = join(__dirname, '..', 'data', 'majorCities.json');

export class GeocodingService {
  async searchCity(query: string): Promise<City[]> {
    try {
      // Try with country suffix if not already included
      let searchQuery = query;
      if (!query.toLowerCase().includes('brazil') && !query.toLowerCase().includes('brasil')) {
        // Don't auto-add, let user specify
      }
      
      const response = await axios.get(`${NOMINATIM_BASE}/search`, {
        params: {
          q: searchQuery,
          format: 'json',
          limit: 10,
          addressdetails: 1,
          'accept-language': 'en',
        },
        headers: {
          'User-Agent': 'StravaJourneyApp/1.0 (https://github.com/strava-journey)',
          'Accept': 'application/json',
          'Accept-Language': 'en',
        },
        timeout: 15000,
      });

      if (!response.data || !Array.isArray(response.data)) {
        console.warn('Nominatim returned invalid data format');
        return [];
      }

      if (response.data.length === 0) {
        console.warn(`No results found for query: ${query}`);
        return [];
      }

      return response.data.map((result: any) => ({
        name: result.display_name.split(',')[0],
        lat: parseFloat(result.lat),
        lng: parseFloat(result.lon),
        country: result.address?.country,
        state: result.address?.state || result.address?.region,
      }));
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.message;
      console.error('Nominatim API error:', status, message);
      
      if (status === 429 || status === 403) {
        console.warn('Rate limited by Nominatim. Please wait a moment and try again.');
      }
      
      // Return empty array on error instead of throwing
      return [];
    }
  }

  async getCityCoordinates(cityName: string): Promise<City | null> {
    const cities = await this.searchCity(cityName);
    return cities.length > 0 ? cities[0] : null;
  }

  // Get major cities for suggestions - uses cached pre-computed coordinates
  getMajorCities(): City[] {
    try {
      const fileContent = readFileSync(MAJOR_CITIES_FILE, 'utf-8');
      const cities: City[] = JSON.parse(fileContent);
      return cities;
    } catch (error) {
      console.error('Error reading major cities file:', error);
      // Return empty array if file doesn't exist or can't be read
      return [];
    }
  }
}
