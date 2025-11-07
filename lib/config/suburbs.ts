/**
 * Australian City Suburb Configurations
 * Used for multi-suburb lead searches
 */

import type { SuburbSearchConfig } from "@/lib/services/city-search";

export type { SuburbSearchConfig };

export const SYDNEY_SUBURBS: SuburbSearchConfig = {
  city: "Sydney",
  state: "NSW",
  suburbs: [
    // Inner City
    "Sydney CBD",
    "Surry Hills",
    "Redfern",
    "Darlinghurst",
    "Potts Point",
    "Pyrmont",
    "Ultimo",

    // Eastern Suburbs
    "Bondi",
    "Bondi Junction",
    "Paddington",
    "Woollahra",
    "Double Bay",
    "Rose Bay",
    "Randwick",
    "Coogee",
    "Maroubra",

    // Inner West
    "Newtown",
    "Marrickville",
    "Enmore",
    "Stanmore",
    "Leichhardt",
    "Annandale",
    "Glebe",
    "Balmain",
    "Rozelle",

    // North Shore
    "North Sydney",
    "Crows Nest",
    "Neutral Bay",
    "Mosman",
    "Cremorne",
    "Chatswood",
    "St Leonards",
    "Artarmon",
    "Willoughby",

    // Northern Beaches
    "Manly",
    "Dee Why",
    "Brookvale",
    "Mona Vale",
    "Freshwater",

    // South
    "Hurstville",
    "Kogarah",
    "Rockdale",
    "Arncliffe",
    "Mascot",
    "Alexandria",
    "Waterloo",

    // West
    "Parramatta",
    "Westmead",
    "Homebush",
    "Strathfield",
    "Burwood",
    "Ashfield",
    "Concord",

    // South West
    "Liverpool",
    "Campbelltown",
    "Bankstown",
    "Cabramatta",

    // North West
    "Ryde",
    "Macquarie Park",
    "Castle Hill",
    "Hornsby",
    "Pennant Hills",
  ],
};

export const MELBOURNE_SUBURBS: SuburbSearchConfig = {
  city: "Melbourne",
  state: "VIC",
  suburbs: [
    // Inner City
    "Melbourne CBD",
    "Southbank",
    "Docklands",
    "Carlton",
    "Fitzroy",
    "Collingwood",
    "Richmond",
    "South Yarra",
    "Prahran",
    "St Kilda",

    // Inner North
    "Brunswick",
    "Northcote",
    "Thornbury",
    "Preston",
    "Coburg",
    "Reservoir",

    // Inner South
    "South Melbourne",
    "Port Melbourne",
    "Albert Park",
    "Middle Park",
    "Elwood",
    "Brighton",
    "Caulfield",
    "Malvern",
    "Armadale",
    "Toorak",

    // Inner East
    "Hawthorn",
    "Kew",
    "Camberwell",
    "Glen Iris",
    "Ashburton",
    "Box Hill",

    // Inner West
    "Footscray",
    "Yarraville",
    "Williamstown",
    "Seddon",
    "Maribyrnong",
    "Essendon",
    "Moonee Ponds",

    // Outer East
    "Ringwood",
    "Blackburn",
    "Mitcham",
    "Nunawading",
    "Doncaster",
    "Templestowe",

    // South East
    "Clayton",
    "Oakleigh",
    "Bentleigh",
    "Moorabbin",
    "Cheltenham",
    "Dandenong",

    // Outer North
    "Bundoora",
    "Heidelberg",
    "Greensborough",
    "Eltham",
    "Diamond Creek",

    // Outer West
    "Werribee",
    "Hoppers Crossing",
    "Point Cook",
    "Sunshine",
    "Deer Park",

    // Outer South
    "Frankston",
    "Mornington",
    "Cranbourne",
    "Berwick",
    "Pakenham",
  ],
};

export const BRISBANE_SUBURBS: SuburbSearchConfig = {
  city: "Brisbane",
  state: "QLD",
  suburbs: [
    "Brisbane CBD",
    "Fortitude Valley",
    "South Brisbane",
    "West End",
    "New Farm",
    "Teneriffe",
    "Woolloongabba",
    "Spring Hill",
    "Paddington",
    "Milton",
    "Toowong",
    "Indooroopilly",
    "Chermside",
    "Carindale",
    "Garden City",
    "Sunnybank",
    "Southport",
    "Surfers Paradise",
  ],
};

export const PERTH_SUBURBS: SuburbSearchConfig = {
  city: "Perth",
  state: "WA",
  suburbs: [
    // Inner City
    "Perth CBD",
    "Northbridge",
    "West Perth",
    "East Perth",
    "Leederville",
    "Mount Lawley",
    "Highgate",
    "Subiaco",

    // Coastal
    "Fremantle",
    "Cottesloe",
    "Scarborough",
    "Hillarys",
    "Joondalup",

    // Inner South
    "Victoria Park",
    "Como",
    "South Perth",
    "Applecross",
    "Booragoon",
    "Melville",

    // Inner North
    "Osborne Park",
    "Balcatta",
    "Morley",
    "Dianella",
    "Inglewood",

    // Eastern Suburbs
    "Midland",
    "Belmont",
    "Cannington",
    "Bentley",

    // South
    "Canning Vale",
    "Rockingham",
    "Mandurah",

    // North
    "Wanneroo",
    "Ellenbrook",
  ],
};

export const ADELAIDE_SUBURBS: SuburbSearchConfig = {
  city: "Adelaide",
  state: "SA",
  suburbs: [
    // Inner City
    "Adelaide CBD",
    "North Adelaide",
    "Unley",
    "Norwood",
    "Hyde Park",
    "Goodwood",
    "Wayville",

    // Inner West
    "Hindmarsh",
    "Mile End",
    "Torrensville",
    "Thebarton",

    // Eastern Suburbs
    "Burnside",
    "Magill",
    "Kensington Park",
    "Campbelltown",

    // North
    "Prospect",
    "Nailsworth",
    "Medindie",
    "Elizabeth",
    "Salisbury",

    // South
    "Marion",
    "Morphett Vale",
    "Mitcham",
    "Blackwood",

    // Coastal
    "Glenelg",
    "Brighton",
    "Henley Beach",
    "Semaphore",
    "Grange",

    // West
    "West Lakes",
    "Port Adelaide",
  ],
};

export const CANBERRA_SUBURBS: SuburbSearchConfig = {
  city: "Canberra",
  state: "ACT",
  suburbs: [
    // Inner North
    "Canberra City",
    "Civic",
    "Braddon",
    "Turner",
    "Lyneham",
    "Dickson",

    // Inner South
    "Barton",
    "Kingston",
    "Manuka",
    "Griffith",
    "Narrabundah",
    "Fyshwick",

    // Belconnen
    "Belconnen",
    "Bruce",
    "Gungahlin",

    // Woden
    "Woden",
    "Phillip",
    "Mawson",

    // Tuggeranong
    "Tuggeranong",
    "Erindale",
  ],
};

export const HOBART_SUBURBS: SuburbSearchConfig = {
  city: "Hobart",
  state: "TAS",
  suburbs: [
    // Inner City
    "Hobart CBD",
    "North Hobart",
    "West Hobart",
    "South Hobart",
    "Battery Point",
    "Sandy Bay",

    // Eastern Shore
    "Bellerive",
    "Rosny",
    "Howrah",
    "Warrane",

    // Northern Suburbs
    "Glenorchy",
    "Moonah",
    "New Town",
    "Lenah Valley",

    // South
    "Kingston",
    "Blackmans Bay",
  ],
};

/**
 * Get suburb configuration by city name
 */
export function getSuburbConfig(cityName: string): SuburbSearchConfig | null {
  const normalizedCity = cityName.toLowerCase().trim();

  if (normalizedCity.includes("sydney")) return SYDNEY_SUBURBS;
  if (normalizedCity.includes("melbourne")) return MELBOURNE_SUBURBS;
  if (normalizedCity.includes("brisbane")) return BRISBANE_SUBURBS;
  if (normalizedCity.includes("perth")) return PERTH_SUBURBS;
  if (normalizedCity.includes("adelaide")) return ADELAIDE_SUBURBS;
  if (normalizedCity.includes("canberra")) return CANBERRA_SUBURBS;
  if (normalizedCity.includes("hobart")) return HOBART_SUBURBS;

  return null;
}

/**
 * Check if a location supports suburb search
 */
export function supportsSuburbSearch(location: string): boolean {
  return getSuburbConfig(location) !== null;
}

/**
 * Get all supported cities
 */
export function getSupportedCities(): string[] {
  return [
    "Sydney, NSW",
    "Melbourne, VIC",
    "Brisbane, QLD",
    "Perth, WA",
    "Adelaide, SA",
    "Canberra, ACT",
    "Hobart, TAS",
  ];
}

/**
 * Get all city configs
 */
export function getAllCityConfigs(): SuburbSearchConfig[] {
  return [
    SYDNEY_SUBURBS,
    MELBOURNE_SUBURBS,
    BRISBANE_SUBURBS,
    PERTH_SUBURBS,
    ADELAIDE_SUBURBS,
    CANBERRA_SUBURBS,
    HOBART_SUBURBS,
  ];
}

/**
 * Get city configs excluding specified states
 */
export function getCityConfigsExcludingStates(
  excludedStates: string[],
): SuburbSearchConfig[] {
  const allCities = getAllCityConfigs();
  const normalizedExcluded = excludedStates.map((s) => s.toUpperCase());
  return allCities.filter((city) => !normalizedExcluded.includes(city.state));
}
