/**
 * ABN Extractor Utility
 * Finds and validates Australian Business Numbers in text content
 */

/**
 * Extract ABN numbers from text content
 * ABN format: 11 digits, often displayed as XX XXX XXX XXX
 */
export function extractABN(content: string): string | null {
  if (!content) return null;

  // Common ABN patterns:
  // 1. "ABN: 12 345 678 901" or "ABN 12 345 678 901"
  // 2. "ABN:12345678901" or "ABN 12345678901"
  // 3. Just "12 345 678 901" near words like "ABN", "Australian Business Number"

  const patterns = [
    // Pattern 1: ABN with spaces - match "ABN is 12 345 678 901" or "ABN: 12 345 678 901"
    /ABN[\s:is]*\s*(\d{2})\s+(\d{3})\s+(\d{3})\s+(\d{3})/i,
    // Pattern 2: ABN without spaces - match "ABN 12345678901" or "ABN:12345678901"
    /ABN[\s:is]*\s*(\d{11})/i,
    // Pattern 3: Australian Business Number with spaces
    /Australian\s+Business\s+Number[\s:is]*\s*(\d{2})\s+(\d{3})\s+(\d{3})\s+(\d{3})/i,
    // Pattern 4: Australian Business Number without spaces
    /Australian\s+Business\s+Number[\s:is]*\s*(\d{11})/i,
  ];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      // Extract just the digits
      let abn: string;

      if (match.length === 2) {
        // Pattern matched single group (11 digits)
        abn = match[1].replace(/\s/g, '');
      } else if (match.length === 5) {
        // Pattern matched four groups (XX XXX XXX XXX)
        abn = match[1] + match[2] + match[3] + match[4];
      } else {
        continue;
      }

      // Validate it's exactly 11 digits
      if (abn.length === 11 && /^\d{11}$/.test(abn)) {
        // Validate ABN checksum
        if (validateABNChecksum(abn)) {
          return abn;
        }
      }
    }
  }

  return null;
}

/**
 * Validate ABN using the official checksum algorithm
 * See: https://abr.business.gov.au/Help/AbnFormat
 */
export function validateABNChecksum(abn: string): boolean {
  if (abn.length !== 11 || !/^\d{11}$/.test(abn)) {
    return false;
  }

  // ABN checksum algorithm:
  // 1. Subtract 1 from the first digit
  // 2. Multiply each digit by its weighting factor (10,1,3,5,7,9,11,13,15,17,19)
  // 3. Sum all the products
  // 4. Divide by 89 - if remainder is 0, ABN is valid

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
  const digits = abn.split('').map(Number);

  // Subtract 1 from first digit
  digits[0] = digits[0] - 1;

  // Calculate weighted sum
  const sum = digits.reduce((acc, digit, index) => {
    return acc + (digit * weights[index]);
  }, 0);

  // Check if divisible by 89
  return sum % 89 === 0;
}

/**
 * Format ABN for display (XX XXX XXX XXX)
 */
export function formatABN(abn: string): string {
  if (abn.length !== 11) return abn;
  return `${abn.slice(0, 2)} ${abn.slice(2, 5)} ${abn.slice(5, 8)} ${abn.slice(8, 11)}`;
}
