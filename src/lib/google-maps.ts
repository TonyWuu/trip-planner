// Shared Google Maps configuration
// This ensures the API is loaded with all required libraries

export const GOOGLE_MAPS_LIBRARIES: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

// Debug: log if API key is missing
if (typeof window !== 'undefined' && !GOOGLE_MAPS_API_KEY) {
  console.warn('Google Maps API key is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local');
}
