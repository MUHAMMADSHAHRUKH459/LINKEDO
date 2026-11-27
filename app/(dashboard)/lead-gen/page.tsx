"use client";

import { useState, useEffect } from "react";
import { Trash2, CheckCircle2, AlertCircle, Briefcase, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getJobLeads,
  discoverJobLeads,
  addJobLead,
  verifyJobLead,
  deleteJobLead,
} from "@/lib/actions/job-leads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BusinessLeads from "@/components/lead-gen/business-leads";

type EmploymentType = 'Any' | 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
type SavedJobLead = {
  id: string;
  job_title: string;
  employer_name: string;
  location: string | null;
  verification_status: string;
};
type JobSearchResult = {
  employer_name: string;
  job_title: string;
  location: string;
  employment_type: string;
  source_name: string;
  source_url: string;
  description: string;
  verification_status?: string;
};

export default function LeadGenPage() {
  const [jobLeads, setJobLeads] = useState<SavedJobLead[]>([]);
  const [searchResults, setSearchResults] = useState<JobSearchResult[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [fetchErrorJobs, setFetchErrorJobs] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useState({
    keywords: '',
    location: '',
    employmentType: 'Any' as EmploymentType,
    boardTokens: '',
  });

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    try {
      setIsLoadingJobs(true);
      setFetchErrorJobs(null);
      const data = await getJobLeads();
      setJobLeads(data);
    } catch (error) {
      setFetchErrorJobs(getErrorMessage(error, 'Failed to load job leads'));
    } finally {
      setIsLoadingJobs(false);
    }
  }

  const handleJobSearch = async () => {
    try {
      setIsLoadingJobs(true);
      setFetchErrorJobs(null);
      const tokens = searchParams.boardTokens.split(',').filter(t => t.trim()).map(t => t.trim());
      const params = {
        keywords: searchParams.keywords,
        location: searchParams.location,
        employmentType: searchParams.employmentType,
        boardTokens: tokens.length > 0 ? tokens : undefined,
      };
      const results = await discoverJobLeads(params);
      setSearchResults(results);
    } catch (error) {
      setFetchErrorJobs(getErrorMessage(error, 'Job search failed'));
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleAddJobLead = async (job: JobSearchResult) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const data = {
        employer_name: job.employer_name,
        job_title: job.job_title,
        location: job.location,
        employment_type: job.employment_type,
        source_name: job.source_name,
        source_url: job.source_url,
        description: job.description,
      };
      await addJobLead(data);
      setSuccessMessage('Job lead saved successfully');
      // Refresh saved jobs after adding
      loadJobs();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to save job lead'));
    }
  };

  const handleDeleteJobLead = async (id: string) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteJobLead(id);
      setSuccessMessage('Job lead deleted successfully');
      loadJobs();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Failed to delete job lead'));
    }
  };

  const handleVerifyJobLead = async (id: string) => {
    try {
      setErrorMessage(null);
      const result = await verifyJobLead(id);
      setSuccessMessage(`Job lead marked ${result.status}`);
      loadJobs();
    } catch (error) {
      setErrorMessage(getErrorMessage(error, 'Verification failed'));
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-300">
      {/* Lead Generation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Lead Generation</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage business prospects and job leads.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/60 bg-slate-900/35 p-4 sm:p-6">
        <BusinessLeads />
      </div>

      {/* Job Leads Search Section */}
      <section className="space-y-5 rounded-2xl border border-blue-400/15 bg-gradient-to-br from-blue-500/[0.07] via-slate-900/60 to-slate-900/50 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Greenhouse Job Finder</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
              Search public Greenhouse boards and save listings separately from your business leads.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-1.5 text-xs font-medium text-slate-400">
            Keywords
            <Input
              aria-label="Job keywords"
              value={searchParams.keywords}
              onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
              placeholder="e.g., Software Engineer"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400">
            Location
            <Input
              aria-label="Job location"
              value={searchParams.location}
              onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
              placeholder="e.g., Remote, New York"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400">
            Employment type
            <Select
              aria-label="Employment type"
              value={searchParams.employmentType}
              onValueChange={(value: string) => setSearchParams({ ...searchParams, employmentType: value as EmploymentType })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Any">Any</SelectItem>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
                <SelectItem value="Contract">Contract</SelectItem>
                <SelectItem value="Internship">Internship</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="space-y-1.5 text-xs font-medium text-slate-400 md:col-span-2 xl:col-span-3">
            Greenhouse board tokens
            <Input
              aria-label="Greenhouse board tokens"
              value={searchParams.boardTokens}
              onChange={(e) => setSearchParams({ ...searchParams, boardTokens: e.target.value })}
              placeholder="Comma-separated board tokens"
            />
            <span className="block text-[11px] font-normal text-slate-500">
              Optional. Add the company board token(s) to search specific public Greenhouse boards.
            </span>
          </label>
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-700/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">Search results can be reviewed and saved to your job leads.</p>
          <Button onClick={handleJobSearch} disabled={isLoadingJobs} className="w-full sm:w-auto">
            {isLoadingJobs ? 'Searching Greenhouse...' : 'Find Jobs'}
          </Button>
        </div>
      </section>

      {/* Feedback Messages */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Results */}
      {isLoadingJobs ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-800 animate-pulse bg-slate-900/50">
              <div className="h-4 bg-slate-800 rounded w-1/3 mb-2"></div>
            </div>
          ))}
        </div>
      ) : fetchErrorJobs ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{fetchErrorJobs}</span>
        </div>
      ) : searchResults.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Search results</h3>
              <p className="mt-1 text-xs text-slate-500">{searchResults.length} job listings found</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3">
          {searchResults.map((job, index) => (
            <Card key={index} className="p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h4 className="text-base font-semibold text-slate-100">{job.job_title}</h4>
                  <p className="mt-1 text-sm text-slate-300">{job.employer_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{job.location}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary">{job.employment_type}</Badge>
                    {job.verification_status && (
                      <Badge variant={job.verification_status === 'Verified' ? 'success' : 'secondary'}>
                        {job.verification_status}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  <a
                    href={job.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-300 transition-all duration-200 hover:bg-slate-800/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <LinkIcon className="h-4 w-4" /> Source
                  </a>
                  <Button onClick={() => handleAddJobLead(job)} size="sm">Save</Button>
                </div>
              </div>
            </Card>
          ))}
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-700/70 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-300">No search results yet</p>
          <p className="mt-1 text-xs text-slate-500">Enter search criteria above and run a Greenhouse board search.</p>
        </div>
      )}

      {/* Saved Job Leads */}
      <section className="space-y-4 border-t border-slate-800/80 pt-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Saved job leads</h3>
          <p className="mt-1 text-xs text-slate-500">Verify or remove listings you have saved from Greenhouse.</p>
        </div>
        {isLoadingJobs ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-800 animate-pulse bg-slate-900/50">
              <div className="h-4 bg-slate-800 rounded w-1/3 mb-2"></div>
            </div>
          ))}
        </div>
      ) : fetchErrorJobs ? (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{fetchErrorJobs}</span>
        </div>
      ) : jobLeads.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {jobLeads.map((job) => (
            <Card key={job.id} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-blue-400/15 bg-blue-500/10 text-blue-300">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-slate-100">{job.job_title}</h4>
                  <p className="mt-1 text-xs text-slate-400">{job.employer_name} · {job.location}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Button onClick={() => handleVerifyJobLead(job.id)} size="sm" className="order-2 sm:order-1">
                  Verify
                </Button>
                <Badge variant={job.verification_status === 'Verified' ? 'success' : 'secondary'} className="order-1 sm:order-2">
                  {job.verification_status}
                </Badge>
                <Button variant="ghost" size="icon" aria-label={`Delete ${job.job_title}`} onClick={() => handleDeleteJobLead(job.id)} className="order-3 text-slate-400 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
          </div>
      ) : (
        <p className="text-slate-400 text-center py-8">No saved job leads yet.</p>
      )}
      </section>

    </div>
  );
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}