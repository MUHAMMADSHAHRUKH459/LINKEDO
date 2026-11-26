'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { requestGreenhouseJobUrl, validateGreenhouseJobUrl } from './job-lead-url';

/**
 * Universal Job Search Parameters interface.
 * Industry-independent and supports any profession, skill, location, or employment type.
 */
export interface JobSearchParams {
  industry?: string;
  keywords: string;
  location: string;
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Any';
  /**
   * Optional: Specific ATS board tokens to search.
   * Discovered from company career page URLs (e.g., boards.greenhouse.io/{token}).
   */
  boardTokens?: string[];
}

/**
 * Common interface for all job source providers.
 */
export interface JobSourceProvider {
  name: string;
  searchJobs: (params: JobSearchParams) => Promise<Array<{
    employer_name: string;
    job_title: string;
    location: string;
    employment_type: string;
    source_name: string;
    source_url: string;
    description: string;
    industry?: string;
  }>>;
}

/**
 * Greenhouse Public Job Board Provider.
 * Queries permitted public employer boards via Greenhouse Boards API.
 */
class GreenhouseJobProvider implements JobSourceProvider {
  name = 'Greenhouse Public Boards';

  async searchJobs(params: JobSearchParams) {
    const allJobs: any[] = [];

    const tokens = params.boardTokens || [];
    if (tokens.length === 0) return [];

    const keywordLower = (params.keywords || '').toLowerCase();
    const locationLower = (params.location || '').toLowerCase();
    const industryLower = (params.industry || '').toLowerCase();
    const employmentTypeFilter = params.employmentType || 'Any';

    for (const token of tokens) {
      try {
        // 1. Fetch Authoritative Employer Name
        const boardInfoResponse = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        let employerName = 'Unknown Employer';
        if (boardInfoResponse.ok) {
          const info = await boardInfoResponse.json();
          employerName = info.name || 'Unknown Employer';
        }

        // 2. Fetch Jobs
        const response = await fetch(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (!response.ok) continue;

        const data = await response.json();
        const jobs = data.jobs || [];

        for (const job of jobs) {
          const title = job.title || '';
          const locationName = job.location?.name || '';
          const content = job.content || '';
          const absoluteUrl = job.absolute_url || '';

          // Map Employment Type from Greenhouse specific metadata structure
          // Greenhouse often uses "Job Type" or "Employment Type" in metadata arrays
          let employmentType = 'Unspecified';
          if (Array.isArray(job.metadata)) {
            const etMeta = job.metadata.find((m: any) =>
              m.name?.toLowerCase().trim() === 'employment type' ||
              m.name?.toLowerCase().trim() === 'job type'
            );
            if (etMeta?.value) employmentType = etMeta.value;
          }

          // Greenhouse uses departments. This is not authoritative industry classification.
          const departments = Array.isArray(job.departments)
            ? job.departments.map((d: any) => d.name).join(', ')
            : '';

          // Filtering
          const matchesKeyword = !keywordLower ||
            title.toLowerCase().includes(keywordLower) ||
            content.toLowerCase().includes(keywordLower);

          const matchesLocation = !locationLower ||
            (locationLower === 'remote' && (locationName.toLowerCase().includes('remote') || title.toLowerCase().includes('remote'))) ||
            locationName.toLowerCase().includes(locationLower);

          const matchesEmploymentType = employmentTypeFilter === 'Any' ||
            employmentType.toLowerCase().includes(employmentTypeFilter.toLowerCase());

          const matchesIndustry = !industryLower ||
            departments.toLowerCase().includes(industryLower) ||
            content.toLowerCase().includes(industryLower);

          if (matchesKeyword && matchesLocation && matchesEmploymentType && matchesIndustry) {
            allJobs.push({
              employer_name: employerName,
              job_title: title,
              location: locationName || 'Not specified',
              employment_type: employmentType,
              source_name: `Greenhouse (${employerName})`,
              source_url: absoluteUrl,
              description: content.replace(/<[^>]*>?/gm, '').substring(0, 500),
              industry: departments || undefined, // Note: This uses Department as an industry proxy
            });
          }
        }
      } catch (err) {
        console.error(`Greenhouse search error for ${token}:`, err);
      }
    }

    return allJobs;
  }
}

const jobProviders: JobSourceProvider[] = [
  new GreenhouseJobProvider(),
];

export async function getJobLeads() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('job_leads')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch job leads: ${error.message}`);
  return data || [];
}

/**
 * Discovers job leads across registered providers.
 * Returns results for the user to review before saving.
 */
export async function discoverJobLeads(params: JobSearchParams) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  let results: any[] = [];
  for (const provider of jobProviders) {
    try {
      const providerResults = await provider.searchJobs(params);
      results = [...results, ...providerResults];
    } catch (err) {
      console.error(`${provider.name} failed:`, err);
    }
  }
  return results;
}

/**
 * Verifies a job lead's current status.
 * Conservatively marks as Unverified on transient errors.
 */
export async function verifyJobLead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data: lead, error } = await supabase
    .from('job_leads')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !lead) throw new Error('Job lead not found');

  let verificationStatus = 'Unverified';
  const sourceUrl = validateGreenhouseJobUrl(lead.source_url);

  if (sourceUrl) {
    try {
      const status = await requestGreenhouseJobUrl(sourceUrl.href);
      if (status === 404 || status === 410) {
        verificationStatus = 'Expired';
      }
    } catch {
      // Network failures and timeouts remain conservatively unverified.
    }
  }

  const { error: updateError } = await supabase
    .from('job_leads')
    .update({
      verification_status: verificationStatus,
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', user.id);

  if (updateError) throw new Error(`Verification update failed: ${updateError.message}`);

  revalidatePath('/lead-gen');
  return { status: verificationStatus };
}

export async function addJobLead(data: {
  employer_name: string;
  job_title: string;
  location?: string;
  employment_type?: string;
  source_name: string;
  source_url: string;
  description?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const sourceUrl = validateGreenhouseJobUrl(data.source_url);
  if (!sourceUrl) {
    throw new Error('Only HTTPS Greenhouse job URLs are allowed');
  }

  // Prevent duplicates for the same user and job URL
  const { data: existing, error: checkError } = await supabase
    .from('job_leads')
    .select('id')
    .eq('user_id', user.id)
    .eq('source_url', sourceUrl.href)
    .maybeSingle();

  if (checkError) {
    throw new Error(`Duplicate check failed: ${checkError.message}`);
  }

  if (existing) {
    return { success: true, message: 'Job lead already exists' };
  }

  const { error } = await supabase.from('job_leads').insert({
    user_id: user.id,
    ...data,
    source_url: sourceUrl.href,
    verification_status: 'Unverified',
  });

  if (error) throw new Error(`Insert failed: ${error.message}`);
  revalidatePath('/lead-gen');
  return { success: true };
}

export async function deleteJobLead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { error } = await supabase
    .from('job_leads')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw new Error(`Delete failed: ${error.message}`);
  revalidatePath('/lead-gen');
}
