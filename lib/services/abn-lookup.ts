/**
 * ABN Lookup Service
 * Queries the Australian Business Register (ABR) for business information
 *
 * Note: You'll need to register for a free ABN Lookup API key at:
 * https://abr.business.gov.au/Tools/WebServices
 */

export interface ABNLookupResult {
  abn: string;
  entityName: string;
  abnStatus: 'Active' | 'Cancelled' | string;
  abnStatusEffectiveFrom: string; // ISO date string
  gstStatus?: string;
  entityTypeCode?: string;
  entityTypeName?: string;
  businessAge?: number; // Years since registration
}

/**
 * Look up business information from ABN
 * Uses the ABR Web Services API
 */
export async function lookupABN(abn: string): Promise<ABNLookupResult | null> {
  const apiKey = process.env.ABN_LOOKUP_API_KEY;

  if (!apiKey) {
    console.warn('[ABN Lookup] ABN_LOOKUP_API_KEY not configured - skipping lookup');
    return null;
  }

  // Remove spaces from ABN
  const cleanABN = abn.replace(/\s/g, '');

  if (cleanABN.length !== 11 || !/^\d{11}$/.test(cleanABN)) {
    console.warn(`[ABN Lookup] Invalid ABN format: ${abn}`);
    return null;
  }

  try {
    console.log(`[ABN Lookup] Looking up ABN: ${cleanABN}`);

    // ABR Web Services API endpoint
    // Documentation: https://abr.business.gov.au/json/AbnDetails.aspx?abn=51824753556&guid=YOUR_GUID
    const url = new URL('https://abr.business.gov.au/json/AbnDetails.aspx');
    url.searchParams.append('abn', cleanABN);
    url.searchParams.append('guid', apiKey);

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      // Add timeout
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`[ABN Lookup] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    // The API returns JSONP format: callback({...})
    // We need to extract the JSON from the callback wrapper
    const responseText = await response.text();

    // Extract JSON from callback wrapper
    let data;
    if (responseText.startsWith('callback(')) {
      // Remove "callback(" from start and ")" from end
      const jsonText = responseText.slice(9, -1);
      data = JSON.parse(jsonText);
    } else {
      // If it's already JSON, parse directly
      data = JSON.parse(responseText);
    }

    // Check if ABN was found
    if (!data || data.Message) {
      console.warn(`[ABN Lookup] ABN not found or error: ${data?.Message || 'Unknown error'}`);
      return null;
    }

    // Parse the response
    const abnStatus = data.AbnStatus || 'Unknown';
    const abnStatusDate = data.AbnStatusEffectiveFrom || '';
    const entityName = data.EntityName || data.BusinessName?.[0]?.OrganisationName || 'Unknown';

    // Calculate business age
    let businessAge: number | undefined;
    if (abnStatusDate) {
      const registrationDate = new Date(abnStatusDate);
      const now = new Date();
      const ageInMs = now.getTime() - registrationDate.getTime();
      businessAge = Math.floor(ageInMs / (1000 * 60 * 60 * 24 * 365.25));
    }

    const result: ABNLookupResult = {
      abn: cleanABN,
      entityName,
      abnStatus,
      abnStatusEffectiveFrom: abnStatusDate,
      gstStatus: data.Gst || undefined,
      entityTypeCode: data.EntityTypeCode || undefined,
      entityTypeName: data.EntityTypeName || undefined,
      businessAge,
    };

    console.log(`[ABN Lookup] Found: ${entityName} (${abnStatus}, ${businessAge || 'unknown'} years old)`);

    return result;

  } catch (error) {
    console.error('[ABN Lookup] Error:', error);
    return null;
  }
}

/**
 * Validate if an ABN is currently active
 */
export function isActiveABN(result: ABNLookupResult): boolean {
  return result.abnStatus.toLowerCase() === 'active';
}

/**
 * Get business age category
 */
export function getBusinessAgeCategory(businessAge?: number): string {
  if (businessAge === undefined) return 'unknown';
  if (businessAge < 1) return 'new (< 1 year)';
  if (businessAge < 3) return 'young (1-3 years)';
  if (businessAge < 10) return 'established (3-10 years)';
  if (businessAge < 20) return 'mature (10-20 years)';
  return 'well-established (20+ years)';
}
