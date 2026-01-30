'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Activity, Category, FixedItem, DayInfo } from '@/lib/types';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';
import { formatTimeRange, getActivityDateStr } from '@/lib/utils';
import { getCategoryIcon } from './Icons';
import { format, parseISO, isWithinInterval, startOfDay } from 'date-fns';

interface MapViewProps {
  activities: Activity[];
  flights: FixedItem[];
  hotels: FixedItem[];
  categories: Category[];
  days: DayInfo[];
  onActivityClick?: (activity: Activity) => void;
  onHotelClick?: (hotel: FixedItem) => void;
}

interface GeocodedLocation {
  id: string;
  type: 'activity' | 'hotel';
  item: Activity | FixedItem;
  lat: number;
  lng: number;
  address: string;
  orderNumber?: number; // Order within the day (1, 2, 3...)
  dateStr?: string;
}

const CATEGORY_MARKER_COLORS: Record<string, string> = {
  '#3B82F6': '#3B82F6', // blue
  '#22C55E': '#22C55E', // green
  '#F97316': '#F97316', // orange
  '#A855F7': '#A855F7', // purple
  '#6B7280': '#6B7280', // gray
  '#EC4899': '#EC4899', // pink
  '#14B8A6': '#14B8A6', // teal
  '#F59E0B': '#F59E0B', // amber
  '#EF4444': '#EF4444', // red
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

// Calculate order numbers for activities within each day
function calculateOrderNumbers(locations: GeocodedLocation[]): GeocodedLocation[] {
  // Group activities by date
  const activitiesByDate: Record<string, GeocodedLocation[]> = {};

  locations.forEach((loc) => {
    if (loc.type === 'activity' && loc.dateStr) {
      if (!activitiesByDate[loc.dateStr]) {
        activitiesByDate[loc.dateStr] = [];
      }
      activitiesByDate[loc.dateStr].push(loc);
    }
  });

  // Sort each day's activities by start time and assign order numbers
  Object.values(activitiesByDate).forEach((dayActivities) => {
    dayActivities.sort((a, b) => {
      const actA = a.item as Activity;
      const actB = b.item as Activity;
      return new Date(actA.start_datetime).getTime() - new Date(actB.start_datetime).getTime();
    });

    dayActivities.forEach((loc, index) => {
      loc.orderNumber = index + 1;
    });
  });

  return locations;
}

// Center on Hong Kong by default
const defaultCenter = {
  lat: 22.3193,
  lng: 114.1694,
};

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: true,
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'on' }],
    },
  ],
};

export default function MapView({
  activities,
  flights,
  hotels,
  categories,
  days,
  onActivityClick,
  onHotelClick,
}: MapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<GeocodedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeocodedLocation | null>(null);
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [selectedDay, setSelectedDay] = useState<string>('all'); // 'all' or dateStr

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Get items with addresses
  const itemsWithAddresses = useMemo(() => {
    const items: { id: string; type: 'activity' | 'hotel'; item: Activity | FixedItem; address: string; dateStr?: string }[] = [];

    // Add activities with addresses
    activities.forEach((activity) => {
      if (activity.address) {
        items.push({
          id: activity.id,
          type: 'activity',
          item: activity,
          address: activity.address,
          dateStr: getActivityDateStr(activity),
        });
      }
    });

    // Add hotels with addresses (hotels show on all days)
    hotels.forEach((hotel) => {
      const details = hotel.details as { address?: string } | undefined;
      if (details?.address) {
        items.push({
          id: hotel.id,
          type: 'hotel',
          item: hotel,
          address: details.address,
        });
      }
    });

    return items;
  }, [activities, hotels]);

  // Filter locations based on selected day
  const filteredLocations = useMemo(() => {
    if (selectedDay === 'all') {
      return geocodedLocations;
    }
    return geocodedLocations.filter((loc) => {
      if (loc.type === 'activity') {
        // Filter activities by date
        const activity = loc.item as Activity;
        return getActivityDateStr(activity) === selectedDay;
      } else if (loc.type === 'hotel') {
        // Filter hotels - only show if selected day is within check-in/check-out range
        const hotel = loc.item as FixedItem;
        const selectedDate = parseISO(selectedDay);
        // Extract just the date part from datetime strings
        const checkInDateStr = hotel.start_datetime.split('T')[0];
        const checkOutDateStr = hotel.end_datetime.split('T')[0];
        const checkIn = parseISO(checkInDateStr);
        const checkOut = parseISO(checkOutDateStr);
        // Show hotel if selected day is on or after check-in and before check-out
        return selectedDate >= checkIn && selectedDate < checkOut;
      }
      return false;
    });
  }, [geocodedLocations, selectedDay]);

  // Fit bounds when filter changes
  useEffect(() => {
    if (!map || filteredLocations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    filteredLocations.forEach((loc) => {
      bounds.extend({ lat: loc.lat, lng: loc.lng });
    });

    // Fit bounds with padding
    map.fitBounds(bounds, {
      top: 80,    // Account for day filter bar
      bottom: 50,
      left: 50,
      right: 50,
    });

    // Prevent zooming in too close for single markers or nearby markers
    const listener = google.maps.event.addListenerOnce(map, 'idle', () => {
      const currentZoom = map.getZoom();
      if (currentZoom && currentZoom > 15) {
        map.setZoom(15);
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, selectedDay, filteredLocations.length]);

  // Geocode addresses when map is loaded
  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);

    if (itemsWithAddresses.length === 0) {
      setGeocodingStatus('done');
      return;
    }

    setGeocodingStatus('loading');
    const geocoder = new google.maps.Geocoder();
    const locations: GeocodedLocation[] = [];
    let completed = 0;

    itemsWithAddresses.forEach((item, index) => {
      // Add delay to avoid rate limiting
      setTimeout(() => {
        geocoder.geocode({ address: item.address }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            locations.push({
              id: item.id,
              type: item.type,
              item: item.item,
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
              address: item.address,
              dateStr: item.dateStr,
            });
          }

          completed++;
          if (completed === itemsWithAddresses.length) {
            // Calculate order numbers for activities within each day
            const locationsWithOrder = calculateOrderNumbers(locations);
            setGeocodedLocations(locationsWithOrder);
            setGeocodingStatus('done');

            // Fit bounds to show all markers
            if (locations.length > 0 && mapInstance) {
              const bounds = new google.maps.LatLngBounds();
              locations.forEach((loc) => {
                bounds.extend({ lat: loc.lat, lng: loc.lng });
              });
              mapInstance.fitBounds(bounds, 50);
            }
          }
        });
      }, index * 200); // 200ms delay between requests
    });
  }, [itemsWithAddresses]);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getCategoryColor = (activity: Activity): string => {
    const category = categories.find((c) => c.name === activity.category);
    return category?.color || '#A855F7';
  };

  const handleMarkerClick = (location: GeocodedLocation) => {
    setSelectedLocation(location);
  };

  const handleInfoWindowClose = () => {
    setSelectedLocation(null);
  };

  const handleViewDetails = () => {
    if (!selectedLocation) return;

    if (selectedLocation.type === 'activity' && onActivityClick) {
      onActivityClick(selectedLocation.item as Activity);
    } else if (selectedLocation.type === 'hotel' && onHotelClick) {
      onHotelClick(selectedLocation.item as FixedItem);
    }
    setSelectedLocation(null);
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100 text-gray-500">
        <p>Error loading maps. Please check your API key.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-100">
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Loading map...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full">
      {/* Day Filter */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedDay === 'all'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Days
          </button>
          {days.map((day) => (
            <button
              key={day.dateStr}
              onClick={() => setSelectedDay(day.dateStr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedDay === day.dateStr
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {format(day.date, 'MMM d')}
            </button>
          ))}
        </div>
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={defaultCenter}
        zoom={12}
        onLoad={onMapLoad}
        onUnmount={onMapUnmount}
        options={mapOptions}
      >
        {filteredLocations.map((location) => {
          const isActivity = location.type === 'activity';
          const activity = isActivity ? (location.item as Activity) : null;
          const color = isActivity && activity ? getCategoryColor(activity) : '#22C55E';
          const label = isActivity && location.orderNumber
            ? location.orderNumber.toString()
            : (location.type === 'hotel' ? 'H' : '');

          return (
            <Marker
              key={location.id}
              position={{ lat: location.lat, lng: location.lng }}
              onClick={() => handleMarkerClick(location)}
              label={label ? {
                text: label,
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 'bold',
              } : undefined}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 14,
                labelOrigin: new google.maps.Point(0, 0),
              }}
            />
          );
        })}

        {selectedLocation && (
          <InfoWindow
            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            onCloseClick={handleInfoWindowClose}
          >
            <div className="p-2 max-w-[250px]">
              {selectedLocation.type === 'activity' ? (
                <>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {(selectedLocation.item as Activity).name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-1">
                    {(selectedLocation.item as Activity).category}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    {formatTimeRange(
                      (selectedLocation.item as Activity).start_datetime,
                      (selectedLocation.item as Activity).end_datetime
                    )}
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {(selectedLocation.item as FixedItem).name}
                  </h3>
                  <p className="text-xs text-green-600 mb-2">Hotel</p>
                </>
              )}
              <p className="text-xs text-gray-500 mb-2">{selectedLocation.address}</p>
              <button
                onClick={handleViewDetails}
                className="w-full px-3 py-1.5 text-xs font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
              >
                View Details
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-3 text-xs">
        <h4 className="font-semibold text-gray-700 mb-2">Legend</h4>
        <div className="space-y-1.5">
          {categories.slice(0, 5).map((cat) => (
            <div key={cat.id} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-gray-600">{cat.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border border-white shadow-sm" />
            <span className="text-gray-600">Hotels</span>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {geocodingStatus === 'loading' && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 text-xs text-gray-600 flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>Finding locations...</span>
        </div>
      )}

      {geocodingStatus === 'done' && geocodedLocations.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-100/90 backdrop-blur-sm rounded-full shadow-lg px-4 py-2 text-xs text-amber-700">
          No activities with addresses found
        </div>
      )}
    </div>
  );
}
