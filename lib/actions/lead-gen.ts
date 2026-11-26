'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  COMPANY_SIZE_RANGES,
  DEFAULT_LEAD_CRITERIA,
  LEAD_PIPELINE_STAGES,
  companyDuplicateKeys,
  normalizeWebsite,
  type CompanyContact,
  type CompanyImportRow,
  type CompanySize,
  type LeadGenerationCriteria,
} from '@/lib/lead-gen/utils';

type CompanyInput = {
  name: string;
  website: string | null;
  industry: string | null;
  location: string | null;
  company_size: CompanySize | null;
};

type ContactInput = {
  full_name: string;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_profile_url: string | null;
  verification_status: 'Unverified' | 'Verified';
};

async function getAuthenticatedContext() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return { supabase, user };
}

function getOptionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  const cleaned = value.trim();
  if (cleaned.length > maxLength) throw new Error(`${label} must be ${maxLength} characters or fewer.`);
  return cleaned || null;
}

function validateCompanyInput(value: unknown): CompanyInput {
  if (!value || typeof value !== 'object') throw new Error('Company details are required.');
  const input = value as Record<string, unknown>;
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('Company name is required.');
  }
  const name = input.name.trim();
  if (name.length > 200) throw new Error('Company name must be 200 characters or fewer.');

  const rawWebsite = getOptionalText(input.website, 'Website', 500);
  const website = rawWebsite ? normalizeWebsite(rawWebsite) : null;
  const industry = getOptionalText(input.industry, 'Industry', 120);
  const location = getOptionalText(input.location, 'Location', 200);
  const rawSize = getOptionalText(input.company_size, 'Company size', 40);
  if (rawSize && !COMPANY_SIZE_RANGES.includes(rawSize as CompanySize)) {
    throw new Error('Choose a supported company-size range.');
  }

  return {
    name,
    website,
    industry,
    location,
    company_size: rawSize as CompanySize | null,
  };
}

function normalizeCriteriaList(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length > 50 || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${label} must be a list of up to 50 text values.`);
  }
  return [...new Set(value.map((entry: string) => entry.trim()).filter(Boolean))];
}

function validateCriteria(value: unknown): LeadGenerationCriteria {
  if (!value || typeof value !== 'object') throw new Error('Scoring criteria are required.');
  const criteria = value as Record<string, unknown>;
  const industries = normalizeCriteriaList(criteria.industries, 'Industries');
  const locations = normalizeCriteriaList(criteria.locations, 'Locations');
  if (
    !Array.isArray(criteria.company_sizes) ||
    criteria.company_sizes.length > COMPANY_SIZE_RANGES.length ||
    criteria.company_sizes.some(
      (size) => typeof size !== 'string' || !COMPANY_SIZE_RANGES.includes(size as CompanySize),
    )
  ) {
    throw new Error('Select valid target company-size ranges.');
  }
  const company_sizes = [...new Set(criteria.company_sizes as CompanySize[])];
  if (industries.some((industry) => industry.length > 120)) {
    throw new Error('Industry criteria must be 120 characters or fewer each.');
  }
  if (locations.some((location) => location.length > 200)) {
    throw new Error('Location criteria must be 200 characters or fewer each.');
  }
  return { industries, locations, company_sizes };
}

async function assertCompanyIsUnique(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  company: CompanyInput,
  excludedId?: string,
) {
  const { data, error } = await supabase
    .from('target_companies')
    .select('id, name, website, location')
    .eq('user_id', userId);
  if (error) throw new Error(`Could not check for duplicate companies: ${error.message}`);

  const candidateKeys = companyDuplicateKeys(company);
  const duplicate = (data || []).some((existing) => {
    if (existing.id === excludedId) return false;
    const existingKeys = companyDuplicateKeys(existing);
    return candidateKeys.some((key) => existingKeys.includes(key));
  });
  if (duplicate) throw new Error('A company with the same website or name and location already exists.');
}

export async function getTargetCompanies() {
  const { supabase, user } = await getAuthenticatedContext();
  const { data: companies, error } = await supabase
    .from('target_companies')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch target companies: ${error.message}`);
  if (!companies?.length) return [];

  const companyIds = companies.map((company) => company.id);
  const { data: contacts, error: contactError } = await supabase
    .from('company_contacts')
    .select('*')
    .eq('user_id', user.id)
    .in('company_id', companyIds)
    .order('created_at', { ascending: true });

  if (contactError) throw new Error(`Failed to fetch company contacts: ${contactError.message}`);
  return companies.map((company) => ({
    ...company,
    contacts: (contacts || []).filter((contact) => contact.company_id === company.id) as CompanyContact[],
  }));
}

export async function getLeadGenerationCriteria(): Promise<LeadGenerationCriteria> {
  const { supabase, user } = await getAuthenticatedContext();
  const { data, error } = await supabase
    .from('profiles')
    .select('lead_generation_criteria')
    .eq('id', user.id)
    .single();

  if (error) throw new Error(`Failed to load lead scoring criteria: ${error.message}`);
  const rawCriteria = data?.lead_generation_criteria;
  if (!rawCriteria) return DEFAULT_LEAD_CRITERIA;
  return validateCriteria(rawCriteria);
}

export async function saveLeadGenerationCriteria(value: unknown) {
  const { supabase, user } = await getAuthenticatedContext();
  const criteria = validateCriteria(value);
  const { error } = await supabase
    .from('profiles')
    .update({ lead_generation_criteria: criteria })
    .eq('id', user.id);

  if (error) throw new Error(`Failed to save lead scoring criteria: ${error.message}`);
  revalidatePath('/lead-gen');
  return criteria;
}

export async function addTargetCompany(value: unknown) {
  const { supabase, user } = await getAuthenticatedContext();
  const company = validateCompanyInput(value);
  await assertCompanyIsUnique(supabase, user.id, company);

  const { error } = await supabase.from('target_companies').insert({
    user_id: user.id,
    ...company,
    source_type: 'Manual',
    status: 'New',
  });
  if (error) throw new Error(`Failed to add company: ${error.message}`);

  revalidatePath('/lead-gen');
}

export async function updateTargetCompany(id: string, value: unknown) {
  const { supabase, user } = await getAuthenticatedContext();
  if (typeof id !== 'string' || !id) throw new Error('A company ID is required.');
  const company = validateCompanyInput(value);
  await assertCompanyIsUnique(supabase, user.id, company, id);

  const { data, error } = await supabase
    .from('target_companies')
    .update(company)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Failed to update company: ${error.message}`);
  if (!data) throw new Error('Company not found.');
  revalidatePath('/lead-gen');
}

export async function updateTargetCompanyStage(id: string, stage: string) {
  const { supabase, user } = await getAuthenticatedContext();
  if (
    typeof id !== 'string' ||
    !id ||
    (!LEAD_PIPELINE_STAGES.includes(stage as (typeof LEAD_PIPELINE_STAGES)[number]) && stage !== 'Closed')
  ) {
    throw new Error('Choose a valid pipeline stage.');
  }

  const { data, error } = await supabase
    .from('target_companies')
    .update({ status: stage })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Failed to update pipeline stage: ${error.message}`);
  if (!data) throw new Error('Company not found.');
  revalidatePath('/lead-gen');
}

export async function deleteTargetCompany(id: string) {
  const { supabase, user } = await getAuthenticatedContext();
  if (typeof id !== 'string' || !id) throw new Error('A company ID is required.');

  const { data, error } = await supabase
    .from('target_companies')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Failed to delete company: ${error.message}`);
  if (!data) throw new Error('Company not found.');
  revalidatePath('/lead-gen');
}

export async function importTargetCompanies(value: unknown) {
  const { supabase, user } = await getAuthenticatedContext();
  if (!Array.isArray(value)) throw new Error('Invalid import data.');
  if (value.length > 500) throw new Error('Import up to 500 company rows at a time.');

  const { data: existingCompanies, error: existingError } = await supabase
    .from('target_companies')
    .select('id, name, website, location')
    .eq('user_id', user.id);
  if (existingError) throw new Error(`Could not check existing companies: ${existingError.message}`);

  const existingKeys = new Set(
    (existingCompanies || []).flatMap((company) => companyDuplicateKeys(company)),
  );
  const batchKeys = new Set<string>();
  const accepted: Array<CompanyInput & { rowNumber: number }> = [];
  const failures: Array<{ rowNumber: number; message: string }> = [];
  let duplicateCount = 0;

  for (const [index, rawRow] of value.entries()) {
    const rowNumber =
      rawRow && typeof rawRow === 'object' && typeof (rawRow as CompanyImportRow).rowNumber === 'number'
        ? (rawRow as CompanyImportRow).rowNumber
        : index + 2;
    try {
      const company = validateCompanyInput(rawRow);
      const keys = companyDuplicateKeys(company);
      if (keys.some((key) => existingKeys.has(key) || batchKeys.has(key))) {
        duplicateCount += 1;
        continue;
      }
      keys.forEach((key) => batchKeys.add(key));
      accepted.push({ ...company, rowNumber });
    } catch (error) {
      failures.push({
        rowNumber,
        message: error instanceof Error ? error.message : 'Invalid company data.',
      });
    }
  }

  let successCount = 0;
  if (accepted.length) {
    const { error } = await supabase.from('target_companies').insert(
      accepted.map((company) => ({
        user_id: user.id,
        name: company.name,
        website: company.website,
        industry: company.industry,
        location: company.location,
        company_size: company.company_size,
        source_type: 'CSV Import',
        status: 'New',
      })),
    );
    if (error) {
      accepted.forEach(({ rowNumber }) =>
        failures.push({ rowNumber, message: `Import batch failed: ${error.message}` }),
      );
    } else {
      successCount = accepted.length;
    }
  }

  if (successCount) revalidatePath('/lead-gen');
  return {
    successCount,
    failedCount: failures.length,
    duplicateCount,
    failures,
  };
}

function validateContactInput(value: unknown): ContactInput {
  if (!value || typeof value !== 'object') throw new Error('Contact details are required.');
  const input = value as Record<string, unknown>;
  if (typeof input.full_name !== 'string' || !input.full_name.trim()) {
    throw new Error('Contact full name is required.');
  }

  const full_name = input.full_name.trim();
  if (full_name.length > 200) throw new Error('Contact name must be 200 characters or fewer.');
  const job_title = getOptionalText(input.job_title, 'Job title', 160);
  const email = getOptionalText(input.email, 'Email', 254);
  const phone = getOptionalText(input.phone, 'Phone', 50);
  const rawLinkedInUrl = getOptionalText(input.linkedin_profile_url, 'LinkedIn profile URL', 500);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Enter a valid contact email address.');
  }

  let linkedin_profile_url: string | null = null;
  if (rawLinkedInUrl) {
    let url: URL;
    try {
      url = new URL(rawLinkedInUrl);
    } catch {
      throw new Error('Enter a valid LinkedIn profile URL.');
    }
    if (
      url.protocol !== 'https:' ||
      !(url.hostname === 'linkedin.com' || url.hostname.endsWith('.linkedin.com'))
    ) {
      throw new Error('Contact profile URLs must be HTTPS LinkedIn URLs.');
    }
    linkedin_profile_url = url.toString();
  }

  const verificationStatus = input.verification_status ?? 'Unverified';
  if (verificationStatus !== 'Unverified' && verificationStatus !== 'Verified') {
    throw new Error('Choose a valid contact verification status.');
  }

  return {
    full_name,
    job_title,
    email,
    phone,
    linkedin_profile_url,
    verification_status: verificationStatus,
  };
}

async function assertCompanyOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string,
) {
  const { data, error } = await supabase
    .from('target_companies')
    .select('id')
    .eq('id', companyId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Could not verify company ownership: ${error.message}`);
  if (!data) throw new Error('Company not found.');
}

export async function addCompanyContact(companyId: string, value: unknown) {
  const { supabase, user } = await getAuthenticatedContext();
  if (typeof companyId !== 'string' || !companyId) throw new Error('A company ID is required.');
  const contact = validateContactInput(value);
  await assertCompanyOwnership(supabase, user.id, companyId);

  const { error } = await supabase.from('company_contacts').insert({
    ...contact,
    user_id: user.id,
    company_id: companyId,
    source_type: 'Manual',
  });
  if (error) throw new Error(`Failed to add contact: ${error.message}`);
  revalidatePath('/lead-gen');
}

export async function updateCompanyContact(id: string, value: unknown) {
  const { supabase, user } = await getAuthenticatedContext();
  if (typeof id !== 'string' || !id) throw new Error('A contact ID is required.');
  const contact = validateContactInput(value);

  const { data, error } = await supabase
    .from('company_contacts')
    .update(contact)
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Failed to update contact: ${error.message}`);
  if (!data) throw new Error('Contact not found.');
  revalidatePath('/lead-gen');
}

export async function deleteCompanyContact(id: string) {
  const { supabase, user } = await getAuthenticatedContext();
  if (typeof id !== 'string' || !id) throw new Error('A contact ID is required.');

  const { data, error } = await supabase
    .from('company_contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
  if (!data) throw new Error('Contact not found.');
  revalidatePath('/lead-gen');
}
