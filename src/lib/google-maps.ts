// Shared Google Maps configuration
// This ensures the API is loaded with all required libraries

export const GOOGLE_MAPS_LIBRARIES: ('places')[] = ['places'];

export const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
