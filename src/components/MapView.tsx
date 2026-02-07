'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Activity, Category, FixedItem, DayInfo, WishlistItem } from '@/lib/types';
import { GOOGLE_MAPS_LIBRARIES, GOOGLE_MAPS_API_KEY } from '@/lib/google-maps';
import { formatTimeRange, getActivityDateStr } from '@/lib/utils';
import { getCategoryIcon } from './Icons';
import { format, parseISO, isWithinInterval, startOfDay } from 'date-fns';

interface MapViewProps {
  activities: Activity[];
  flights: FixedItem[];
  hotels: FixedItem[];
  wishlistItems: WishlistItem[];
  categories: Category[];
  days: DayInfo[];
  onActivityClick?: (activity: Activity) => void;
  onHotelClick?: (hotel: FixedItem) => void;
  focusWishlistItem?: WishlistItem | null;
  onFocusHandled?: () => void;
}

interface GeocodedLocation {
  id: string;
  type: 'activity' | 'hotel' | 'wishlist';
  item: Activity | FixedItem | WishlistItem;
  lat: number;
  lng: number;
  address: string;
  orderNumber?: number; // Order within the day (1, 2, 3...)
  dateStr?: string;
  placeId?: string;
  photoUrl?: string;
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
  wishlistItems,
  categories,
  days,
  onActivityClick,
  onHotelClick,
  focusWishlistItem,
  onFocusHandled,
}: MapViewProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [geocodedLocations, setGeocodedLocations] = useState<GeocodedLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<GeocodedLocation | null>(null);
  const [geocodingStatus, setGeocodingStatus] = useState<'idle' | 'loading' | 'done'>('idle');
  const [selectedDay, setSelectedDay] = useState<string>('all'); // 'all' or dateStr
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const skipBoundsFitRef = useRef(false);
  const focusingRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  // Get items with addresses
  const itemsWithAddresses = useMemo(() => {
    const items: { id: string; type: 'activity' | 'hotel' | 'wishlist'; item: Activity | FixedItem | WishlistItem; address: string; dateStr?: string }[] = [];

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

    // Add wishlist items with addresses
    wishlistItems.forEach((wishlistItem) => {
      if (wishlistItem.address) {
        items.push({
          id: wishlistItem.id,
          type: 'wishlist',
          item: wishlistItem,
          address: wishlistItem.address,
        });
      }
    });

    return items;
  }, [activities, hotels, wishlistItems]);

  // Filter locations based on selected day
  const filteredLocations = useMemo(() => {
    if (selectedDay === 'all') {
      return geocodedLocations;
    }
    return geocodedLocations.filter((loc) => {
      if (loc.type === 'wishlist') {
        // Always show wishlist items
        return true;
      } else if (loc.type === 'activity') {
        // Filter activities by date
        const activity = loc.item as Activity;
        return getActivityDateStr(activity) === selectedDay;
      } else if (loc.type === 'hotel') {
        // Filter hotels - only show if selected day is within check-in/check-out range
        const hotel = loc.item as FixedItem;
        const selectedDate = parseISO(selectedDay);
        const checkInDateStr = hotel.start_datetime.split('T')[0];
        const checkOutDateStr = hotel.end_datetime.split('T')[0];
        const checkIn = parseISO(checkInDateStr);
        const checkOut = parseISO(checkOutDateStr);
        return selectedDate >= checkIn && selectedDate < checkOut;
      }
      return false;
    });
  }, [geocodedLocations, selectedDay]);

  // Fit bounds when day filter changes or geocoding completes
  useEffect(() => {
    if (!map || geocodingStatus !== 'done') return;
    if (skipBoundsFitRef.current) {
      skipBoundsFitRef.current = false;
      return;
    }

    const boundsLocations = filteredLocations.filter((loc) => loc.type !== 'wishlist');
    if (boundsLocations.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    boundsLocations.forEach((loc) => {
      bounds.extend({ lat: loc.lat, lng: loc.lng });
    });

    map.fitBounds(bounds, {
      top: 80,
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, selectedDay, geocodingStatus]);

  // Focus on a specific wishlist item when requested — geocodes immediately if needed
  useEffect(() => {
    if (!focusWishlistItem || !map || focusingRef.current) return;

    const zoomToLocation = (location: GeocodedLocation) => {
      skipBoundsFitRef.current = true;
      map.panTo({ lat: location.lat, lng: location.lng });
      map.setZoom(16);
      handleMarkerClick(location);
      setSelectedDay('all');
      onFocusHandled?.();
    };

    // Check if already geocoded
    const existing = geocodedLocations.find(
      (loc) => loc.type === 'wishlist' && loc.id === focusWishlistItem.id
    );

    if (existing) {
      zoomToLocation(existing);
      return;
    }

    // Not yet geocoded — geocode it directly without waiting for batch
    if (!focusWishlistItem.address) {
      onFocusHandled?.();
      return;
    }

    focusingRef.current = true;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: focusWishlistItem.address }, (results, status) => {
      focusingRef.current = false;
      if (status === 'OK' && results && results[0]) {
        const newLoc: GeocodedLocation = {
          id: focusWishlistItem.id,
          type: 'wishlist',
          item: focusWishlistItem,
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          address: focusWishlistItem.address!,
          placeId: results[0].place_id,
        };
        setGeocodedLocations((prev) => {
          // Avoid duplicates if batch geocoding already added it
          if (prev.some((loc) => loc.id === newLoc.id)) return prev;
          return calculateOrderNumbers([...prev, newLoc]);
        });
        zoomToLocation(newLoc);
      } else {
        onFocusHandled?.();
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusWishlistItem, map, geocodedLocations]);

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    placesServiceRef.current = new google.maps.places.PlacesService(mapInstance);
  }, []);

  // Geocode addresses reactively when items change
  useEffect(() => {
    if (!map) return;

    if (itemsWithAddresses.length === 0) {
      setGeocodedLocations([]);
      setGeocodingStatus('done');
      return;
    }

    // Find items not yet geocoded
    const alreadyGeocoded = new Set(geocodedLocations.map((loc) => loc.id));
    const newItems = itemsWithAddresses.filter((item) => !alreadyGeocoded.has(item.id));

    // Remove geocoded locations for items that no longer exist
    const currentIds = new Set(itemsWithAddresses.map((item) => item.id));
    const retained = geocodedLocations.filter((loc) => currentIds.has(loc.id));

    if (newItems.length === 0) {
      if (retained.length !== geocodedLocations.length) {
        setGeocodedLocations(calculateOrderNumbers(retained));
      }
      setGeocodingStatus('done');
      return;
    }

    setGeocodingStatus('loading');
    const geocoder = new google.maps.Geocoder();
    const newLocations: GeocodedLocation[] = [];
    let completed = 0;

    newItems.forEach((item, index) => {
      setTimeout(() => {
        geocoder.geocode({ address: item.address }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            newLocations.push({
              id: item.id,
              type: item.type,
              item: item.item,
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng(),
              address: item.address,
              dateStr: item.dateStr,
              placeId: results[0].place_id,
            });
          }

          completed++;
          if (completed === newItems.length) {
            setGeocodedLocations((prev) => {
              const ids = new Set(itemsWithAddresses.map((i) => i.id));
              const kept = prev.filter((loc) => ids.has(loc.id));
              const existingIds = new Set(kept.map((loc) => loc.id));
              const deduped = newLocations.filter((loc) => !existingIds.has(loc.id));
              return calculateOrderNumbers([...kept, ...deduped]);
            });
            setGeocodingStatus('done');
          }
        });
      }, index * 200);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, itemsWithAddresses]);

  const onMapUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getCategoryColor = (activity: Activity): string => {
    const category = categories.find((c) => c.name === activity.category);
    return category?.color || '#A855F7';
  };

  const handleMarkerClick = (location: GeocodedLocation) => {
    setSelectedLocation(location);

    if (location.placeId && !photoUrls[location.placeId]) {
      // Create PlacesService on demand with a div (more reliable than map instance)
      if (!placesServiceRef.current && map) {
        const div = document.createElement('div');
        placesServiceRef.current = new google.maps.places.PlacesService(div);
      }
      if (placesServiceRef.current) {
        placesServiceRef.current.getDetails(
          { placeId: location.placeId, fields: ['photos'] },
          (place, status) => {
            console.log('PlacesService getDetails status:', status, 'photos:', place?.photos?.length);
            if (status === google.maps.places.PlacesServiceStatus.OK && place?.photos?.[0]) {
              const url = place.photos[0].getUrl({ maxWidth: 400, maxHeight: 200 });
              setPhotoUrls((prev) => ({ ...prev, [location.placeId!]: url }));
            }
          }
        );
      } else {
        console.warn('PlacesService not available');
      }
    }
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
      {/* Fix Google Maps InfoWindow: overlay close button instead of reserving space */}
      <style>{`
        .gm-style-iw-chr {
          position: absolute !important;
          right: 0 !important;
          top: 0 !important;
          z-index: 10 !important;
        }
      `}</style>
      {/* Day Filter - grouped by city */}
      <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-2 max-w-[calc(100%-2rem)]">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSelectedDay('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedDay === 'all'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Days
          </button>
          {(() => {
            const cityColors: Record<string, string> = {
              'Hong Kong': '#ff6b6b',
              'Shanghai': '#4d96ff',
              'Chengdu': '#6bcb77',
              'Transit': '#9ca3af',
            };
            const getCityColor = (city: string) => {
              for (const [key, color] of Object.entries(cityColors)) {
                if (city.includes(key)) return color;
              }
              return '#9ca3af';
            };

            // Group consecutive days by city
            const groups: { city: string; days: DayInfo[] }[] = [];
            days.forEach((day) => {
              const lastGroup = groups[groups.length - 1];
              if (lastGroup && lastGroup.city === day.city) {
                lastGroup.days.push(day);
              } else {
                groups.push({ city: day.city, days: [day] });
              }
            });

            return groups.map((group) => {
              const color = getCityColor(group.city);
              const isAnySelected = group.days.some((d) => d.dateStr === selectedDay);
              return (
                <div key={group.city + group.days[0].dateStr} className="flex items-center gap-1">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-1 shrink-0"
                    style={{ color }}
                  >
                    {group.city.includes('→') ? group.city : group.city}
                  </span>
                  {group.days.map((day) => (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedDay(day.dateStr)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                        selectedDay === day.dateStr
                          ? 'text-white shadow-sm'
                          : 'text-gray-600 hover:opacity-80'
                      }`}
                      style={selectedDay === day.dateStr
                        ? { background: color }
                        : { background: `${color}15`, border: `1px solid ${color}20` }
                      }
                    >
                      {format(day.date, 'd')}
                    </button>
                  ))}
                  <div className="w-px h-4 bg-gray-200 mx-1 last:hidden" />
                </div>
              );
            });
          })()}
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
          const isWishlist = location.type === 'wishlist';
          const activity = isActivity ? (location.item as Activity) : null;
          const wishlistItem = isWishlist ? (location.item as WishlistItem) : null;
          const color = isActivity && activity
            ? getCategoryColor(activity)
            : isWishlist
            ? '#F59E0B'
            : '#22C55E';
          const label = isActivity && location.orderNumber
            ? location.orderNumber.toString()
            : location.type === 'hotel' ? 'H'
            : isWishlist ? '★'
            : '';

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
            options={{ maxWidth: 320 }}
          >
            <div style={{ minWidth: '250px' }}>
              {selectedLocation.placeId && photoUrls[selectedLocation.placeId] && (
                <img
                  src={photoUrls[selectedLocation.placeId]}
                  alt={selectedLocation.address}
                  className="w-full h-[140px] object-cover rounded-lg mb-2"
                />
              )}
              <div className="pb-1">
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
              ) : selectedLocation.type === 'wishlist' ? (
                <>
                  <h3 className="font-bold text-gray-900 mb-1">
                    {(selectedLocation.item as WishlistItem).name}
                  </h3>
                  <p className="text-xs text-amber-600 mb-1">
                    {(selectedLocation.item as WishlistItem).category} · Wishlist
                  </p>
                  {(selectedLocation.item as WishlistItem).notes && (
                    <p className="text-xs text-gray-600 mb-2">
                      {(selectedLocation.item as WishlistItem).notes}
                    </p>
                  )}
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
              {selectedLocation.type !== 'wishlist' && (
                <button
                  onClick={handleViewDetails}
                  className="w-full px-3 py-1.5 text-xs font-medium text-white bg-purple-500 rounded-lg hover:bg-purple-600 transition-colors"
                >
                  View Details
                </button>
              )}
              </div>
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500 border border-white shadow-sm" />
            <span className="text-gray-600">Wishlist</span>
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
