/**
 * Utility functions for intelligently displaying company names
 */

/**
 * Check if a string looks like a URL
 */
function isUrl(str: string): boolean {
  if (!str) return false;
  const urlPattern = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i;
  return urlPattern.test(str) || str.includes('http') || str.includes('www.');
}

/**
 * Check if a string looks like a phone number
 */
function isPhoneNumber(str: string): boolean {
  if (!str) return false;
  // Match common phone number patterns:
  // +1234567890, (123) 456-7890, 123-456-7890, 1234567890, etc.
  const phonePattern = /^[\+\(]?[0-9\-\(\)\s\.]{7,}$/;
  return phonePattern.test(str.trim());
}

/**
 * Extract a clean company name from a domain
 * Examples:
 * - www.apple.com -> Apple
 * - microsoft.com -> Microsoft
 * - the-new-york-times.com -> The New York Times
 */
function extractNameFromDomain(domain: string): string {
  if (!domain) return '';

  // Remove protocol and www
  let cleanDomain = domain
    .replace(/^(https?:\/\/)?(www\.)?/i, '')
    .replace(/\/.*$/, ''); // Remove path

  // Remove common TLDs
  const tlds = ['.com', '.org', '.net', '.io', '.co', '.ai', '.app', '.dev', '.biz', '.info'];
  for (const tld of tlds) {
    if (cleanDomain.endsWith(tld)) {
      cleanDomain = cleanDomain.slice(0, -tld.length);
      break;
    }
  }

  // Remove subdomain extensions like .co.uk
  cleanDomain = cleanDomain.replace(/\.(co|ac|gov|edu|org|net)\.[a-z]{2}$/i, '');

  // Convert hyphens to spaces and capitalize
  const words = cleanDomain.split('-').map(word => {
    // Handle special cases
    if (word.toLowerCase() === 'and') return 'and';
    if (word.toLowerCase() === 'the') return 'The';

    // Capitalize first letter of each word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return words.join(' ');
}

/**
 * Check if a name looks like a business name vs. a person name
 * Business indicators: ALL CAPS, contains LLC/Inc/Corp, no lowercase letters
 */
function looksLikeBusinessName(firstname: string | null | undefined, lastname: string | null | undefined): boolean {
  if (!firstname && !lastname) return false;

  const fullName = `${firstname || ''} ${lastname || ''}`.trim();
  if (!fullName) return false;

  // Check for business indicators
  const businessKeywords = /\b(LLC|Inc|Corp|Corporation|Company|Co\.|Ltd|Limited|Group|Services|Solutions|Enterprises)\b/i;
  if (businessKeywords.test(fullName)) return true;

  // Check if it's ALL CAPS (likely a business name)
  if (fullName === fullName.toUpperCase() && fullName.length > 3) return true;

  // Check if lastname contains business-like words
  if (lastname && (lastname.includes(' ') || businessKeywords.test(lastname))) return true;

  return false;
}

/**
 * Check if a string is invalid placeholder text
 */
function isInvalidPlaceholder(str: string | null | undefined): boolean {
  if (!str) return false;
  const lower = str.toLowerCase().trim();
  return (
    lower === 'no website or google profile found' ||
    lower === 'no website' ||
    lower === 'n/a' ||
    lower === 'none' ||
    lower === 'test' ||
    lower === 'zing'
  );
}

/**
 * Get the best display name for a company
 * Priority:
 * 1. Use company field if valid (not phone, not placeholder, not test data)
 * 2. Use firstname + lastname if they look like a business name
 * 3. Extract name from domain/website if available
 * 4. Extract name from email domain if available
 * 5. Use firstname + lastname as person name fallback
 * 6. Use "Company" + ID as fallback
 */
export function getCompanyDisplayName(
  name: string | null | undefined,
  domain: string | null | undefined,
  id: string,
  firstname?: string | null | undefined,
  lastname?: string | null | undefined,
  email?: string | null | undefined
): string {
  // Check if we have a valid name that's not a URL, phone number, or placeholder
  if (name && name.trim() && !isUrl(name) && !isPhoneNumber(name) && !isInvalidPlaceholder(name)) {
    return name.trim();
  }

  // Try firstname + lastname if they look like a business name
  if (looksLikeBusinessName(firstname, lastname)) {
    return `${firstname || ''} ${lastname || ''}`.trim();
  }

  // Try to extract name from domain (skip if it's a placeholder)
  if (domain && domain.trim() && !isPhoneNumber(domain) && !isInvalidPlaceholder(domain)) {
    const extractedName = extractNameFromDomain(domain);
    if (extractedName) {
      return extractedName;
    }
  }

  // If name is actually a URL, try to extract from it
  if (name && isUrl(name)) {
    const extractedName = extractNameFromDomain(name);
    if (extractedName) {
      return extractedName;
    }
  }

  // Try to extract from email domain
  if (email && email.includes('@')) {
    const emailDomain = email.split('@')[1];
    if (emailDomain && !isInvalidPlaceholder(emailDomain)) {
      const extractedName = extractNameFromDomain(emailDomain);
      if (extractedName) {
        return extractedName;
      }
    }
  }

  // Use firstname + lastname as fallback (even if not a business)
  if (firstname || lastname) {
    return `${firstname || ''} ${lastname || ''}`.trim();
  }

  // Last resort: use ID
  return `Company ${id}`;
}

/**
 * Get a subtitle for a company (domain or location)
 */
export function getCompanySubtitle(
  domain: string | null | undefined,
  city: string | null | undefined,
  state: string | null | undefined
): string | null {
  // Prefer domain if available
  if (domain && domain.trim()) {
    // Clean up the domain for display
    return domain.replace(/^(https?:\/\/)?(www\.)?/i, '');
  }

  // Fall back to location
  if (city || state) {
    const parts = [city, state].filter(Boolean);
    return parts.join(', ');
  }

  return null;
}

/**
 * Check if a company has a valid displayable name
 * Returns false if the company would show as "Company {id}"
 */
export function hasValidCompanyName(
  name: string | null | undefined,
  domain: string | null | undefined,
  firstname?: string | null | undefined,
  lastname?: string | null | undefined
): boolean {
  // Check if we have a valid name that's not a URL, phone number, or placeholder
  if (name && name.trim() && !isUrl(name) && !isPhoneNumber(name) && !isInvalidPlaceholder(name)) {
    return true;
  }

  // Check if firstname + lastname look like a business name
  if (looksLikeBusinessName(firstname, lastname)) {
    return true;
  }

  // Check if we can extract a name from domain (and domain is not a phone number or placeholder)
  if (domain && domain.trim() && !isPhoneNumber(domain) && !isInvalidPlaceholder(domain)) {
    const extractedName = extractNameFromDomain(domain);
    if (extractedName) {
      return true;
    }
  }

  // Check if name is a URL we can extract from
  if (name && isUrl(name)) {
    const extractedName = extractNameFromDomain(name);
    if (extractedName) {
      return true;
    }
  }

  // Would show as "Company {id}"
  return false;
}