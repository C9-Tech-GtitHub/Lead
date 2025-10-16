'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Custom marker colors based on grade
const getMarkerIcon = (grade?: string, L?: typeof import('leaflet')) => {
  if (!L) return undefined;

  const colors: Record<string, string> = {
    'A': '#22c55e', // green
    'B': '#3b82f6', // blue
    'C': '#eab308', // yellow
    'D': '#f97316', // orange
    'F': '#ef4444', // red
  };

  const color = grade && grade in colors ? colors[grade] : '#6b7280'; // gray for no grade

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 25px;
        height: 25px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <div style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 12px;
          text-align: center;
          line-height: 21px;
        ">${grade || '?'}</div>
      </div>
    `,
    iconSize: [25, 25],
    iconAnchor: [12, 24],
  });
};

interface Lead {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  google_maps_url?: string;
  latitude?: number;
  longitude?: number;
  compatibility_grade?: string;
  grade_reasoning?: string;
  research_status: string;
  has_multiple_locations?: boolean;
  team_size?: string;
}

interface LeadsMapProps {
  leads: Lead[];
  height?: string;
  onMarkerClick?: (leadId: string) => void;
}

// Component to fit map bounds to markers
function FitBounds({ leads }: { leads: Lead[] }) {
  const map = useMap();

  useEffect(() => {
    const validLeads = leads.filter(lead => lead.latitude && lead.longitude);

    if (validLeads.length === 0) return;

    if (validLeads.length === 1) {
      // Center on single marker
      map.setView([validLeads[0].latitude!, validLeads[0].longitude!], 13);
    } else {
      // Fit bounds to all markers
      const bounds = L.latLngBounds(
        validLeads.map(lead => [lead.latitude!, lead.longitude!])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [leads, map]);

  return null;
}

export function LeadsMap({ leads, height = '600px', onMarkerClick }: LeadsMapProps) {
  const [mounted, setMounted] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import('leaflet') | null>(null);

  // Only render map on client side to avoid SSR issues
  useEffect(() => {
    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then((L) => {
      // Fix for default marker icons in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      setLeaflet(L);
      setMounted(true);
    });
  }, []);

  // Filter leads that have coordinates
  const leadsWithCoordinates = leads.filter(
    lead => lead.latitude && lead.longitude
  );

  if (!mounted) {
    return (
      <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  if (leadsWithCoordinates.length === 0) {
    return (
      <div className="w-full bg-gray-100 rounded-lg flex items-center justify-center" style={{ height }}>
        <div className="text-gray-500">
          No leads with location data available. Run a new search to generate leads with map coordinates.
        </div>
      </div>
    );
  }

  // Default center (will be overridden by FitBounds)
  const defaultCenter: [number, number] = [
    leadsWithCoordinates[0].latitude!,
    leadsWithCoordinates[0].longitude!
  ];

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-200" style={{ height }}>
      <MapContainer
        center={defaultCenter}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds leads={leadsWithCoordinates} />

        {leadsWithCoordinates.map((lead) => {
          const handleViewDetails = () => {
            if (onMarkerClick) {
              onMarkerClick(lead.id);
            }
          };

          const markerIcon = getMarkerIcon(lead.compatibility_grade, leaflet || undefined);

          return (
          <Marker
            key={lead.id}
            position={[lead.latitude!, lead.longitude!]}
            icon={markerIcon}
          >
            <Popup maxWidth={300}>
              <div className="p-2">
                <h3 className="font-bold text-lg mb-2">{lead.name}</h3>

                {lead.compatibility_grade && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold"
                      style={{
                        backgroundColor: lead.compatibility_grade === 'A' ? '#22c55e' :
                                       lead.compatibility_grade === 'B' ? '#3b82f6' :
                                       lead.compatibility_grade === 'C' ? '#eab308' :
                                       lead.compatibility_grade === 'D' ? '#f97316' :
                                       lead.compatibility_grade === 'F' ? '#ef4444' : '#6b7280',
                        color: 'white'
                      }}>
                      Grade {lead.compatibility_grade}
                    </span>
                  </div>
                )}

                {lead.address && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Address:</strong> {lead.address}
                  </p>
                )}

                {lead.phone && (
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>Phone:</strong> {lead.phone}
                  </p>
                )}

                {lead.website && (
                  <p className="text-sm mb-1">
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Visit Website
                    </a>
                  </p>
                )}

                {lead.google_maps_url && (
                  <p className="text-sm">
                    <a
                      href={lead.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      View on Google Maps
                    </a>
                  </p>
                )}

                {lead.grade_reasoning && (
                  <p className="text-sm text-gray-700 mt-2 pt-2 border-t">
                    {lead.grade_reasoning.length > 150
                      ? lead.grade_reasoning.substring(0, 150) + '...'
                      : lead.grade_reasoning}
                  </p>
                )}

                {onMarkerClick && (
                  <button
                    onClick={handleViewDetails}
                    className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                  >
                    View Full Research
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
