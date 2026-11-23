"use client";

import { useState, useEffect } from "react";
import { Building2, Download, Plus, Trash2, CheckCircle2, AlertCircle, Briefcase, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getTargetCompanies,
  addTargetCompany,
  deleteTargetCompany,
} from "@/lib/actions/lead-gen";
import {
  getJobLeads,
  discoverJobLeads,
  addJobLead,
  verifyJobLead,
  deleteJobLead,
} from "@/lib/actions/job-leads";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type EmploymentType = 'Any' | 'Full-time' | 'Part-time' | 'Contract' | 'Internship';

export default function LeadGenPage() {
  const [targetCompanies, setTargetCompanies] = useState<any[]>([]);
  const [jobLeads, setJobLeads] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [fetchErrorCompanies, setFetchErrorCompanies] = useState<string | null>(null);
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
    loadCompanies();
    loadJobs();
  }, []);

  async function loadCompanies() {
    try {
      setIsLoadingCompanies(true);
      setFetchErrorCompanies(null);
      const data = await getTargetCompanies();
      setTargetCompanies(data);
    } catch (err: any) {
      setFetchErrorCompanies(err.message || 'Failed to load target companies');
    } finally {
      setIsLoadingCompanies(false);
    }
  }

  async function loadJobs() {
    try {
      setIsLoadingJobs(true);
      setFetchErrorJobs(null);
      const data = await getJobLeads();
      setJobLeads(data);
    } catch (err: any) {
      setFetchErrorJobs(err.message || 'Failed to load job leads');
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
    } catch (err: any) {
      setFetchErrorJobs(err.message || 'Job search failed');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleAddJobLead = async (job: any) => {
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save job lead');
    }
  };

  const handleDeleteTargetCompany = async (id: string) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteTargetCompany(id);
      setSuccessMessage('Target company deleted successfully');
      loadCompanies();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete target company');
    }
  };

  const handleDeleteJobLead = async (id: string) => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      await deleteJobLead(id);
      setSuccessMessage('Job lead deleted successfully');
      loadJobs();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete job lead');
    }
  };

  const handleVerifyJobLead = async (id: string) => {
    try {
      setErrorMessage(null);
      const result = await verifyJobLead(id);
      setSuccessMessage(`Job lead marked ${result.status}`);
      loadJobs();
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification failed');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Target Companies Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Lead Generation</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage target companies and job leads.</p>
        </div>
        <div className="flex items-center gap-3">
          <AddTargetCompanyModal onAdded={loadCompanies} onError={(msg) => setErrorMessage(msg)} />
          <ExportCSVButton targetCompanies={targetCompanies} />
        </div>
      </div>

      {/* Job Leads Search Section */}
      <div className="pb-6 border-b border-slate-800/80">
        <h2 className="text-2xl font-bold mb-4 text-slate-100">Job Leads Finder</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Input
            value={searchParams.keywords}
            onChange={(e) => setSearchParams({ ...searchParams, keywords: e.target.value })}
            placeholder="Keywords (e.g., Software Engineer)"
          />
          <Input
            value={searchParams.location}
            onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
            placeholder="Location (e.g., Remote, New York)"
          />
          <Select
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
          <Input
            value={searchParams.boardTokens}
            onChange={(e) => setSearchParams({ ...searchParams, boardTokens: e.target.value })}
            placeholder="Greenhouse Board Tokens (comma-separated)"
            className="col-span-full"
          />
        </div>
        <Button onClick={handleJobSearch} disabled={isLoadingJobs}>
          {isLoadingJobs ? 'Searching...' : 'Find Jobs'}
        </Button>
      </div>

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
        <div className="grid grid-cols-1 gap-4">
          {searchResults.map((job, index) => (
            <Card key={index} className="p-4 bg-slate-900 border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-100">{job.job_title}</h4>
                  <p className="text-slate-400">{job.employer_name}</p>
                  <p className="text-slate-400 text-sm">{job.location}</p>
                  <Badge variant="secondary" className="mt-2 mr-2">{job.employment_type}</Badge>
                  <Badge variant={job.verification_status === 'Verified' ? 'default' : 'secondary'}>
                    {job.verification_status}
                  </Badge>
                </div>
                <div className="flex flex-col items-end gap-2">
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
      ) : (
        <p className="text-slate-400 text-center py-8">No search results found.</p>
      )}

      {/* Saved Job Leads */}
      <div>
        <h3 className="text-xl font-bold mb-4 text-slate-100">Saved Job Leads</h3>
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
            <Card key={job.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border-slate-800">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                  <Briefcase className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100">{job.job_title}</h4>
                  <p className="text-xs text-slate-400">{job.employer_name} • {job.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button onClick={() => handleVerifyJobLead(job.id)} size="sm">
                  Verify
                </Button>
                <Badge variant={job.verification_status === 'Verified' ? 'default' : 'secondary'}>
                  {job.verification_status}
                </Badge>
                <Button variant="ghost" size="icon" onClick={() => handleDeleteJobLead(job.id)} className="text-slate-400 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-slate-400 text-center py-8">No saved job leads yet.</p>
      )}
      </div>

      {/* Target Companies List */}
      <div>
        <h3 className="text-xl font-bold mb-4 text-slate-100">Target Companies</h3>
        {isLoadingCompanies ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 rounded-xl border border-slate-800 animate-pulse bg-slate-900/50">
                <div className="h-4 bg-slate-800 rounded w-1/3 mb-2"></div>
              </div>
            ))}
          </div>
        ) : fetchErrorCompanies ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{fetchErrorCompanies}</span>
          </div>
        ) : targetCompanies.length === 0 ? (
          <p className="text-slate-400 text-center py-8">No target companies added yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {targetCompanies.map((company) => (
              <Card key={company.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">{company.name}</h4>
                    <p className="text-xs text-slate-400">{company.industry} • {company.website || 'No website'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={company.status === 'Closed' ? 'default' : 'secondary'}>
                    {company.status}
                  </Badge>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteTargetCompany(company.id)} className="text-slate-400 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const AddTargetCompanyModal = ({ onAdded, onError }: { onAdded: () => void; onError: (msg: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addTargetCompany(new FormData(e.currentTarget));
      onAdded();
      setIsOpen(false);
    } catch (err: any) {
      onError(err.message || 'Failed to add company');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Add Company
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add Target Company">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="name" placeholder="Company Name" required />
          <Input name="industry" placeholder="Industry" />
          <Input name="website" placeholder="Website URL" />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Saving...' : 'Save Company'}
          </Button>
        </form>
      </Modal>
    </>
  );
};

const ExportCSVButton = ({ targetCompanies }: { targetCompanies: any[] }) => {
  const exportCSV = () => {
    const headers = ['Company Name', 'Industry', 'Website', 'Status'];
    const rows = targetCompanies.map(c => [c.name, c.industry, c.website, c.status]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'target_companies.csv';
    link.click();
  };

  return (
    <Button variant="outline" onClick={exportCSV} className="gap-2">
      <Download className="h-4 w-4" /> Export CSV
    </Button>
  );
};