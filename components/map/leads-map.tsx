"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom marker colors based on grade
const getMarkerIcon = (grade?: string, L?: typeof import("leaflet")) => {
  if (!L) return undefined;

  const colors: Record<string, string> = {
    A: "#22c55e", // green
    B: "#3b82f6", // blue
    C: "#eab308", // yellow
    D: "#f97316", // orange
    F: "#ef4444", // red
  };

  const color = grade && grade in colors ? colors[grade] : "#6b7280"; // gray for no grade

  return L.divIcon({
    className: "custom-marker",
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
        ">${grade || "?"}</div>
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
  onGradeUpdate?: (leadId: string, newGrade: string) => void;
}

// Component to fit map bounds to markers - only on initial mount
function FitBounds({
  leads,
  shouldFit,
}: {
  leads: Lead[];
  shouldFit: boolean;
}) {
  const map = useMap();
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    // Only fit bounds once on initial mount, or if explicitly requested
    if (!shouldFit || hasInitialized) return;

    const validLeads = leads.filter((lead) => lead.latitude && lead.longitude);

    if (validLeads.length === 0) return;

    if (validLeads.length === 1) {
      // Center on single marker
      map.setView([validLeads[0].latitude!, validLeads[0].longitude!], 13);
    } else {
      // Fit bounds to all markers
      const bounds = L.latLngBounds(
        validLeads.map((lead) => [lead.latitude!, lead.longitude!]),
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    setHasInitialized(true);
  }, [leads, map, shouldFit, hasInitialized]);

  return null;
}

// Australian city coordinates
const AUSSIE_CITIES = [
  { name: "Sydney", lat: -33.8688, lng: 151.2093, zoom: 12 },
  { name: "Melbourne", lat: -37.8136, lng: 144.9631, zoom: 12 },
  { name: "Brisbane", lat: -27.4698, lng: 153.0251, zoom: 12 },
  { name: "Perth", lat: -31.9505, lng: 115.8605, zoom: 12 },
  { name: "Adelaide", lat: -34.9285, lng: 138.6007, zoom: 12 },
  { name: "Canberra", lat: -35.2809, lng: 149.13, zoom: 12 },
  { name: "Gold Coast", lat: -28.0167, lng: 153.4, zoom: 12 },
  { name: "Newcastle", lat: -32.9283, lng: 151.7817, zoom: 12 },
];

// Component to expose map instance
function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  return null;
}

export function LeadsMap({
  leads,
  height = "600px",
  onMarkerClick,
  onGradeUpdate,
}: LeadsMapProps) {
  const [mounted, setMounted] = useState(false);
  const [leaflet, setLeaflet] = useState<typeof import("leaflet") | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Only render map on client side to avoid SSR issues
  useEffect(() => {
    // Dynamically import leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Fix for default marker icons in Next.js
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });
      setLeaflet(L);
      setMounted(true);
    });
  }, []);

  // Filter leads that have coordinates and match grade filter
  const leadsWithCoordinates = leads.filter((lead) => {
    if (!lead.latitude || !lead.longitude) return false;
    if (filterGrade === "all") return true;
    return lead.compatibility_grade === filterGrade;
  });

  if (!mounted) {
    return (
      <div
        className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-gray-500">Loading map...</div>
      </div>
    );
  }

  if (leadsWithCoordinates.length === 0) {
    return (
      <div
        className="w-full bg-gray-100 rounded-lg flex items-center justify-center"
        style={{ height }}
      >
        <div className="text-gray-500">
          No leads with location data available. Run a new search to generate
          leads with map coordinates.
        </div>
      </div>
    );
  }

  // Default center (will be overridden by FitBounds)
  const defaultCenter: [number, number] = [
    leadsWithCoordinates[0].latitude!,
    leadsWithCoordinates[0].longitude!,
  ];

  const handleJumpToCity = (city: (typeof AUSSIE_CITIES)[0]) => {
    if (mapInstance) {
      mapInstance.setView([city.lat, city.lng], city.zoom);
    }
  };

  const handleSetGradeToF = async (leadId: string) => {
    if (!onGradeUpdate) return;

    if (
      confirm(
        "Set this lead to grade F? It will be filtered out if F is not selected.",
      )
    ) {
      onGradeUpdate(leadId, "F");
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Filter and City Jump Controls */}
      <div className="flex flex-wrap gap-2 items-center justify-between flex-shrink-0">
        {/* Grade Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterGrade("all")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterGrade === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterGrade("A")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterGrade === "A"
                ? "bg-green-600 text-white"
                : "bg-white text-green-600 border border-green-300 hover:bg-green-50"
            }`}
          >
            A
          </button>
          <button
            onClick={() => setFilterGrade("B")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterGrade === "B"
                ? "bg-blue-600 text-white"
                : "bg-white text-blue-600 border border-blue-300 hover:bg-blue-50"
            }`}
          >
            B
          </button>
          <button
            onClick={() => setFilterGrade("C")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterGrade === "C"
                ? "bg-yellow-600 text-white"
                : "bg-white text-yellow-600 border border-yellow-300 hover:bg-yellow-50"
            }`}
          >
            C
          </button>
          <button
            onClick={() => setFilterGrade("D")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterGrade === "D"
                ? "bg-orange-600 text-white"
                : "bg-white text-orange-600 border border-orange-300 hover:bg-orange-50"
            }`}
          >
            D
          </button>
          <button
            onClick={() => setFilterGrade("F")}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filterGrade === "F"
                ? "bg-red-600 text-white"
                : "bg-white text-red-600 border border-red-300 hover:bg-red-50"
            }`}
          >
            F
          </button>
        </div>

        {/* City Jump Buttons */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 self-center">
            Jump to city:
          </span>
          {AUSSIE_CITIES.map((city) => (
            <button
              key={city.name}
              onClick={() => handleJumpToCity(city)}
              className="px-3 py-1 bg-white text-gray-700 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {city.name}
            </button>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 w-full rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={defaultCenter}
          zoom={13}
          style={{ height: "100%", width: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController onMapReady={setMapInstance} />
          <FitBounds leads={leadsWithCoordinates} shouldFit={true} />

          {leadsWithCoordinates.map((lead) => {
            const handleViewDetails = () => {
              if (onMarkerClick) {
                onMarkerClick(lead.id);
              }
            };

            const markerIcon = getMarkerIcon(
              lead.compatibility_grade,
              leaflet || undefined,
            );

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
                        <span
                          className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold"
                          style={{
                            backgroundColor:
                              lead.compatibility_grade === "A"
                                ? "#22c55e"
                                : lead.compatibility_grade === "B"
                                  ? "#3b82f6"
                                  : lead.compatibility_grade === "C"
                                    ? "#eab308"
                                    : lead.compatibility_grade === "D"
                                      ? "#f97316"
                                      : lead.compatibility_grade === "F"
                                        ? "#ef4444"
                                        : "#6b7280",
                            color: "white",
                          }}
                        >
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
                          ? lead.grade_reasoning.substring(0, 150) + "..."
                          : lead.grade_reasoning}
                      </p>
                    )}

                    <div className="mt-3 space-y-2">
                      {onMarkerClick && (
                        <button
                          onClick={handleViewDetails}
                          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                        >
                          View Full Research
                        </button>
                      )}

                      {onGradeUpdate && lead.compatibility_grade !== "F" && (
                        <button
                          onClick={() => handleSetGradeToF(lead.id)}
                          className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium cursor-pointer"
                        >
                          Mark as F (Not Interested)
                        </button>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
