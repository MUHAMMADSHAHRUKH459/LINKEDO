export const COMPANY_SIZE_RANGES = [
  'Micro (1-10)',
  'Small (11-50)',
  'Medium (51-200)',
  'Mid-Market (201-1000)',
  'Enterprise (1001+)',
] as const;

export const LEAD_PIPELINE_STAGES = [
  'New',
  'Qualified',
  'Contacted',
  'Interested',
  'Converted',
] as const;

export type CompanySize = (typeof COMPANY_SIZE_RANGES)[number];
export type LeadPipelineStage = (typeof LEAD_PIPELINE_STAGES)[number];
export type CompanySourceType = 'Legacy' | 'Manual' | 'CSV Import';

export type LeadGenerationCriteria = {
  industries: string[];
  locations: string[];
  company_sizes: CompanySize[];
};

export type CompanyContact = {
  id: string;
  company_id: string;
  user_id: string;
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_profile_url: string | null;
  source_type: string;
  verification_status: 'Unverified' | 'Verified';
};

export type TargetCompany = {
  id: string;
  user_id: string;
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  company_size: CompanySize | null;
  source_type: CompanySourceType;
  status: string;
  contacts: CompanyContact[];
};

export type LeadScore = {
  score: number;
  category: 'Needs ICP' | 'Low Fit' | 'Medium Fit' | 'High Fit';
  breakdown: {
    industry: number;
    location: number;
    companySize: number;
    contactCompleteness: number;
  };
};

export type CompanyImportRow = {
  rowNumber: number;
  name: string;
  website: string;
  industry: string;
  location: string;
  company_size: string;
};

export const DEFAULT_LEAD_CRITERIA: LeadGenerationCriteria = {
  industries: [],
  locations: [],
  company_sizes: [],
};

export function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

export function normalizeWebsite(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new Error('Enter a valid website URL.');
  }

  if ((url.protocol !== 'http:' && url.protocol !== 'https:') || !url.hostname) {
    throw new Error('Website URLs must use HTTP or HTTPS.');
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
  const pathname = url.pathname.replace(/\/+$/, '');
  return `https://${hostname}${pathname === '/' ? '' : pathname}`;
}

export function companyDuplicateKeys(company: {
  name: string;
  website?: string | null;
  location?: string | null;
}): string[] {
  const name = normalizeText(company.name).replace(/\s+/g, ' ');
  const location = normalizeText(company.location).replace(/\s+/g, ' ');
  const keys = [`name:${name}|location:${location}`];

  if (company.website) {
    try {
      const website = normalizeWebsite(company.website);
      if (website) {
        const domain = new URL(website).hostname;
        keys.push(`website:${domain}`);
      }
    } catch {
      // Existing legacy website values are not trusted as canonical URLs.
    }
  }

  return keys;
}

export function calculateLeadScore(
  company: Pick<TargetCompany, 'industry' | 'location' | 'company_size' | 'contacts'>,
  criteria: LeadGenerationCriteria,
): LeadScore {
  const industryMatches = Boolean(
    company.industry &&
      criteria.industries.some((industry) => normalizeText(industry) === normalizeText(company.industry)),
  );
  const locationMatches = Boolean(
    company.location &&
      criteria.locations.some((location) => normalizeText(location) === normalizeText(company.location)),
  );
  const sizeMatches = Boolean(
    company.company_size && criteria.company_sizes.includes(company.company_size),
  );

  const bestContactCompleteness = company.contacts.reduce((best, contact) => {
    const completeness =
      5 +
      (contact.job_title?.trim() ? 5 : 0) +
      (contact.email?.trim() || contact.linkedin_profile_url?.trim() ? 5 : 0);
    return Math.max(best, completeness);
  }, 0);

  const breakdown = {
    industry: industryMatches ? 40 : 0,
    location: locationMatches ? 25 : 0,
    companySize: sizeMatches ? 20 : 0,
    contactCompleteness: bestContactCompleteness,
  };
  const score = breakdown.industry + breakdown.location + breakdown.companySize + breakdown.contactCompleteness;
  const criteriaReady =
    criteria.industries.length > 0 &&
    criteria.locations.length > 0 &&
    criteria.company_sizes.length > 0;
  const category: LeadScore['category'] = !criteriaReady
    ? 'Needs ICP'
    : score >= 80
      ? 'High Fit'
      : score >= 50
        ? 'Medium Fit'
        : 'Low Fit';

  return { score, category, breakdown };
}

export function parseCompanyCsv(csv: string): CompanyImportRow[] {
  const text = csv.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(field);
  if (row.some((value) => value.trim())) rows.push(row);
  if (rows.length === 0) throw new Error('The CSV file is empty.');

  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/_/g, ' '));
  const findHeader = (...names: string[]) => headers.findIndex((header) => names.includes(header));
  const nameIndex = findHeader('company name', 'name');
  if (nameIndex < 0) throw new Error('The CSV must include a "Company Name" column.');

  const indexes = {
    name: nameIndex,
    website: findHeader('website', 'company website'),
    industry: findHeader('industry'),
    location: findHeader('location'),
    company_size: findHeader('company size', 'size'),
  };

  return rows.slice(1).map((cells, index) => {
    const cell = (columnIndex: number) => columnIndex < 0 ? '' : (cells[columnIndex] || '').trim();
    return {
      rowNumber: index + 2,
      name: cell(indexes.name),
      website: cell(indexes.website),
      industry: cell(indexes.industry),
      location: cell(indexes.location),
      company_size: cell(indexes.company_size),
    };
  });
}
