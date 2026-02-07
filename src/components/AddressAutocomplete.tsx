'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const justSelectedRef = useRef(false);
  const lastEmittedValueRef = useRef(value);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Debug logging
  useEffect(() => {
    if (loadError) {
      console.error('Google Maps failed to load:', loadError);
    }
  }, [loadError]);

  // Sync external value changes (skip search only for genuinely external updates)
  useEffect(() => {
    if (value !== lastEmittedValueRef.current) {
      justSelectedRef.current = true;
    }
    setInputValue(value);
    lastEmittedValueRef.current = value;
  }, [value]);

  // Initialize autocomplete service when Google Maps is loaded
  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current) {
      try {
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken();
      } catch (err) {
        console.error('Failed to initialize Places AutocompleteService:', err);
      }
    }
  }, [isLoaded]);

  // Update dropdown position when opening
  const updateDropdownPosition = useCallback(() => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, []);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(target);
      const isOutsideDropdown = !dropdownRef.current || !dropdownRef.current.contains(target);
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when dropdown opens or window scrolls/resizes
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isOpen, updateDropdownPosition]);

  // Debounced search for predictions
  const searchPredictions = useCallback(
    (input: string) => {
      if (!input.trim()) {
        setPredictions([]);
        setIsOpen(false);
        return;
      }

      if (!autocompleteServiceRef.current) {
        console.warn('AutocompleteService not initialized. isLoaded:', isLoaded);
        return;
      }

      setIsLoading(true);

      autocompleteServiceRef.current.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current!,
        },
        (results, status) => {
          setIsLoading(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(results as Prediction[]);
            setIsOpen(true);
          } else {
            console.warn('Places API returned status:', status);
            setPredictions([]);
            setIsOpen(false);
          }
        }
      );
    },
    [isLoaded]
  );

  // Debounce input changes - search as user types
  useEffect(() => {
    if (!inputValue.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    // Don't search if we just selected an item or synced from props
    if (justSelectedRef.current) {
      justSelectedRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      searchPredictions(inputValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, searchPredictions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    lastEmittedValueRef.current = newValue;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleSelectPrediction = (prediction: Prediction) => {
    justSelectedRef.current = true;
    lastEmittedValueRef.current = prediction.description;
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
          onFocus={() => {
            // Don't auto-open dropdown on focus - only search when user types
          }}
          onKeyDown={handleKeyDown}
          className={`w-full px-3 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 bg-gray-50 border border-gray-200 focus:outline-none focus:border-[#ff6b6b]/40 focus:ring-1 focus:ring-[#ff6b6b]/20 transition-colors ${className}`}
          placeholder={placeholder}
          autoComplete="off"
        />
        {showMapsButton && inputValue && onMapsClick && (
          <button
            type="button"
            onClick={onMapsClick}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-[#ff6b6b] hover:bg-[#ff6b6b]/10 transition-colors"
          >
            <MapPinIcon className="w-3.5 h-3.5" />
          </button>
        )}
        {isLoading && (
          <div className="absolute right-7 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-3 w-3 text-[#ff6b6b]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
      </div>

      {/* Predictions Dropdown - rendered in portal to avoid overflow clipping */}
      {isOpen && predictions.length > 0 && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed bg-white rounded-lg shadow-lg border border-[#ff6b6b]/20 overflow-hidden max-h-48 overflow-y-auto"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 9999,
          }}
        >
          {predictions.map((prediction) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-3 py-2 text-left hover:bg-[#ff6b6b]/5 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-[#ff6b6b] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800 truncate">
                    {prediction.structured_formatting.main_text}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {prediction.structured_formatting.secondary_text}
                  </div>
                </div>
              </div>
            </button>
          ))}
          <div className="px-3 py-1.5 bg-gray-50 text-[10px] text-gray-400 flex items-center justify-end gap-1">
            <span>Powered by</span>
            <img
              src="https://developers.google.com/static/maps/documentation/images/google_on_white.png"
              alt="Google"
              className="h-2.5"
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
