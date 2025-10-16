/**
 * Australian City Suburb Configurations
 * Used for multi-suburb lead searches
 */

import { SuburbSearchConfig } from '@/lib/services/city-search';

export const SYDNEY_SUBURBS: SuburbSearchConfig = {
  city: 'Sydney',
  state: 'NSW',
  suburbs: [
    // Inner City
    'Sydney CBD',
    'Surry Hills',
    'Redfern',
    'Darlinghurst',
    'Potts Point',
    'Pyrmont',
    'Ultimo',

    // Eastern Suburbs
    'Bondi',
    'Bondi Junction',
    'Paddington',
    'Woollahra',
    'Double Bay',
    'Rose Bay',
    'Randwick',
    'Coogee',
    'Maroubra',

    // Inner West
    'Newtown',
    'Marrickville',
    'Enmore',
    'Stanmore',
    'Leichhardt',
    'Annandale',
    'Glebe',
    'Balmain',
    'Rozelle',

    // North Shore
    'North Sydney',
    'Crows Nest',
    'Neutral Bay',
    'Mosman',
    'Cremorne',
    'Chatswood',
    'St Leonards',
    'Artarmon',
    'Willoughby',

    // Northern Beaches
    'Manly',
    'Dee Why',
    'Brookvale',
    'Mona Vale',
    'Freshwater',

    // South
    'Hurstville',
    'Kogarah',
    'Rockdale',
    'Arncliffe',
    'Mascot',
    'Alexandria',
    'Waterloo',

    // West
    'Parramatta',
    'Westmead',
    'Homebush',
    'Strathfield',
    'Burwood',
    'Ashfield',
    'Concord',

    // South West
    'Liverpool',
    'Campbelltown',
    'Bankstown',
    'Cabramatta',

    // North West
    'Ryde',
    'Macquarie Park',
    'Castle Hill',
    'Hornsby',
    'Pennant Hills'
  ]
};

export const MELBOURNE_SUBURBS: SuburbSearchConfig = {
  city: 'Melbourne',
  state: 'VIC',
  suburbs: [
    // Inner City
    'Melbourne CBD',
    'Southbank',
    'Docklands',
    'Carlton',
    'Fitzroy',
    'Collingwood',
    'Richmond',
    'South Yarra',
    'Prahran',
    'St Kilda',

    // Inner North
    'Brunswick',
    'Northcote',
    'Thornbury',
    'Preston',
    'Coburg',
    'Reservoir',

    // Inner South
    'South Melbourne',
    'Port Melbourne',
    'Albert Park',
    'Middle Park',
    'Elwood',
    'Brighton',
    'Caulfield',
    'Malvern',
    'Armadale',
    'Toorak',

    // Inner East
    'Hawthorn',
    'Kew',
    'Camberwell',
    'Glen Iris',
    'Ashburton',
    'Box Hill',

    // Inner West
    'Footscray',
    'Yarraville',
    'Williamstown',
    'Seddon',
    'Maribyrnong',
    'Essendon',
    'Moonee Ponds',

    // Outer East
    'Ringwood',
    'Blackburn',
    'Mitcham',
    'Nunawading',
    'Doncaster',
    'Templestowe',

    // South East
    'Clayton',
    'Oakleigh',
    'Bentleigh',
    'Moorabbin',
    'Cheltenham',
    'Dandenong',

    // Outer North
    'Bundoora',
    'Heidelberg',
    'Greensborough',
    'Eltham',
    'Diamond Creek',

    // Outer West
    'Werribee',
    'Hoppers Crossing',
    'Point Cook',
    'Sunshine',
    'Deer Park',

    // Outer South
    'Frankston',
    'Mornington',
    'Cranbourne',
    'Berwick',
    'Pakenham'
  ]
};

// Brisbane suburbs (for future expansion)
export const BRISBANE_SUBURBS: SuburbSearchConfig = {
  city: 'Brisbane',
  state: 'QLD',
  suburbs: [
    'Brisbane CBD',
    'Fortitude Valley',
    'South Brisbane',
    'West End',
    'New Farm',
    'Teneriffe',
    'Woolloongabba',
    'Spring Hill',
    'Paddington',
    'Milton',
    'Toowong',
    'Indooroopilly',
    'Chermside',
    'Carindale',
    'Garden City',
    'Sunnybank',
    'Southport',
    'Surfers Paradise'
  ]
};

/**
 * Get suburb configuration by city name
 */
export function getSuburbConfig(cityName: string): SuburbSearchConfig | null {
  const normalizedCity = cityName.toLowerCase().trim();

  if (normalizedCity.includes('sydney')) return SYDNEY_SUBURBS;
  if (normalizedCity.includes('melbourne')) return MELBOURNE_SUBURBS;
  if (normalizedCity.includes('brisbane')) return BRISBANE_SUBURBS;

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
    'Sydney, NSW',
    'Melbourne, VIC',
    'Brisbane, QLD'
  ];
}
