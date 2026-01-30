'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';
import { MapPinIcon } from './Icons';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onMapsClick?: () => void;
  showMapsButton?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a place or address...',
  className = '',
  onMapsClick,
  showMapsButton = true,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Initialize autocomplete service when Google Maps is loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
  }, [isLoaded]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search for predictions
  const searchPredictions = useCallback(
    (input: string) => {
      if (!autocompleteServiceRef.current || !input.trim()) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current!,
          // Bias towards East Asia (Hong Kong, China region)
          locationBias: {
            center: { lat: 25.0, lng: 115.0 },
            radius: 2000000, // 2000km radius
          },
        },
        (results, status) => {
          setIsLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results as Prediction[]);
            setIsOpen(true);
          } else {
            setPredictions([]);
            setIsOpen(false);
          }
        }
      );
    },
    []
  );

  // Debounce input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue && inputValue !== value) {
        searchPredictions(inputValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, value, searchPredictions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setPredictions([]);
    setIsOpen(false);
    // Reset session token after selection (for billing purposes)
    sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => predictions.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-3 pr-12 border border-purple-200 rounded-xl bg-purple-50/30 text-gray-700 placeholder:text-gray-400 focus:border-purple-400 transition-all ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        {showMapsButton && inputValue && onMapsClick && (
          <button
            type="button"
            onClick={onMapsClick}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-purple-500 hover:text-purple-600 hover:bg-purple-100 transition-colors"
          >
            <MapPinIcon className="w-5 h-5" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-12 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-purple-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Predictions Dropdown */}
      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden max-h-64 overflow-y-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start gap-3">
                <MapPinIcon className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-800 truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex items-center justify-end gap-1">
            <span>Powered by</span>
            <img
              src="https://developers.google.com/static/maps/documentation/images/google_on_white.png"
              alt="Google"
              className="h-3"
            />
          </div>
        </div>
      )}
    </div>
  );
}
