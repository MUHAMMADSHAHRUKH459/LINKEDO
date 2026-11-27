"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import {
  addCompanyContact,
  addTargetCompany,
  deleteCompanyContact,
  deleteTargetCompany,
  getLeadGenerationCriteria,
  getTargetCompanies,
  importTargetCompanies,
  saveLeadGenerationCriteria,
  updateCompanyContact,
  updateTargetCompany,
  updateTargetCompanyStage,
} from "@/lib/actions/lead-gen";
import {
  calculateLeadScore,
  COMPANY_SIZE_RANGES,
  DEFAULT_LEAD_CRITERIA,
  LEAD_PIPELINE_STAGES,
  parseCompanyCsv,
  type CompanyContact,
  type CompanyImportRow,
  type CompanySize,
  type LeadGenerationCriteria,
  type TargetCompany,
} from "@/lib/lead-gen/utils";

type Feedback = { kind: "success" | "error"; message: string };
type CompanyFormValues = {
  name: string;
  website: string;
  industry: string;
  location: string;
  company_size: CompanySize | "";
};
type ContactFormValues = {
  full_name: string;
  job_title: string;
  email: string;
  phone: string;
  linkedin_profile_url: string;
  verification_status: "Unverified" | "Verified";
};

const EMPTY_COMPANY: CompanyFormValues = {
  name: "",
  website: "",
  industry: "",
  location: "",
  company_size: "",
};
const EMPTY_CONTACT: ContactFormValues = {
  full_name: "",
  job_title: "",
  email: "",
  phone: "",
  linkedin_profile_url: "",
  verification_status: "Unverified",
};

export default function BusinessLeads() {
  const [companies, setCompanies] = useState<TargetCompany[]>([]);
  const [criteria, setCriteria] = useState<LeadGenerationCriteria>(DEFAULT_LEAD_CRITERIA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingCriteria, setIsSavingCriteria] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [search, setSearch] = useState("");
  const [industryFilter, setIndustryFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [scoreFilter, setScoreFilter] = useState("");
  const [importRows, setImportRows] = useState<CompanyImportRow[] | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  async function loadData() {
    try {
      const [companyData, savedCriteria] = await Promise.all([
        getTargetCompanies(),
        getLeadGenerationCriteria(),
      ]);
      setCompanies(companyData as TargetCompany[]);
      setCriteria(savedCriteria);
    } catch (error) {
      setFeedback({ kind: "error", message: getErrorMessage(error, "Failed to load business leads.") });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    Promise.all([getTargetCompanies(), getLeadGenerationCriteria()])
      .then(([companyData, savedCriteria]) => {
        setCompanies(companyData as TargetCompany[]);
        setCriteria(savedCriteria);
      })
      .catch((error: unknown) => {
        setFeedback({ kind: "error", message: getErrorMessage(error, "Failed to load business leads.") });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const scoredCompanies = useMemo(
    () => companies.map((company) => ({
      company,
      score: calculateLeadScore(company, criteria),
    })),
    [companies, criteria],
  );

  const filteredCompanies = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scoredCompanies.filter(({ company, score }) => {
      if (query && !company.name.toLowerCase().includes(query)) return false;
      if (industryFilter && company.industry !== industryFilter) return false;
      if (locationFilter && company.location !== locationFilter) return false;
      if (sizeFilter && company.company_size !== sizeFilter) return false;
      if (stageFilter && company.status !== stageFilter) return false;
      if (scoreFilter === "low" && score.score > 49) return false;
      if (scoreFilter === "medium" && (score.score < 50 || score.score > 79)) return false;
      if (scoreFilter === "high" && score.score < 80) return false;
      return true;
    });
  }, [scoredCompanies, search, industryFilter, locationFilter, sizeFilter, stageFilter, scoreFilter]);

  const industries = useMemo(
    () => uniqueValues(companies.map((company) => company.industry)),
    [companies],
  );
  const locations = useMemo(
    () => uniqueValues(companies.map((company) => company.location)),
    [companies],
  );

  async function handleSaveCompany(values: CompanyFormValues, id?: string) {
    try {
      clearFeedback();
      if (id) {
        await updateTargetCompany(id, values);
        showSuccess("Company updated.");
      } else {
        await addTargetCompany(values);
        showSuccess("Company added.");
      }
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, "Could not save company."));
      throw error;
    }
  }

  async function handleDeleteCompany(company: TargetCompany) {
    if (!window.confirm(`Delete ${company.name} and its contacts? This cannot be undone.`)) return;
    try {
      clearFeedback();
      await deleteTargetCompany(company.id);
      showSuccess("Company and its contacts deleted.");
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, "Could not delete company."));
    }
  }

  async function handleStageChange(companyId: string, stage: string) {
    try {
      clearFeedback();
      await updateTargetCompanyStage(companyId, stage);
      setCompanies((current) =>
        current.map((company) => company.id === companyId ? { ...company, status: stage } : company),
      );
      showSuccess("Pipeline stage updated.");
    } catch (error) {
      showError(getErrorMessage(error, "Could not update pipeline stage."));
    }
  }

  async function handleSaveContact(
    companyId: string,
    values: ContactFormValues,
    contactId?: string,
  ) {
    try {
      clearFeedback();
      if (contactId) {
        await updateCompanyContact(contactId, values);
        showSuccess("Contact updated.");
      } else {
        await addCompanyContact(companyId, values);
        showSuccess("Contact added.");
      }
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, "Could not save contact."));
      throw error;
    }
  }

  async function handleDeleteContact(contact: CompanyContact) {
    if (!window.confirm(`Delete contact ${contact.full_name}?`)) return;
    try {
      clearFeedback();
      await deleteCompanyContact(contact.id);
      showSuccess("Contact deleted.");
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, "Could not delete contact."));
    }
  }

  async function handleSaveCriteria(nextCriteria: LeadGenerationCriteria) {
    setIsSavingCriteria(true);
    try {
      clearFeedback();
      const saved = await saveLeadGenerationCriteria(nextCriteria);
      setCriteria(saved);
      showSuccess("Scoring criteria saved.");
    } catch (error) {
      showError(getErrorMessage(error, "Could not save scoring criteria."));
    } finally {
      setIsSavingCriteria(false);
    }
  }

  async function handleChooseCsv(file?: File) {
    if (!file) return;
    clearFeedback();
    try {
      setImportRows(parseCompanyCsv(await file.text()));
    } catch (error) {
      setImportRows(null);
      showError(getErrorMessage(error, "Could not read the CSV file."));
    }
  }

  async function handleImport() {
    if (!importRows) return;
    setIsImporting(true);
    clearFeedback();
    try {
      const result = await importTargetCompanies(importRows);
      const parts = [
        `${result.successCount} imported`,
        `${result.duplicateCount} duplicate${result.duplicateCount === 1 ? "" : "s"} skipped`,
        `${result.failedCount} failed`,
      ];
      const failures = result.failures.slice(0, 3)
        .map((failure) => `Row ${failure.rowNumber}: ${failure.message}`)
        .join(" ");
      setFeedback({
        kind: result.failedCount ? "error" : "success",
        message: `CSV import complete: ${parts.join(", ")}.${failures ? ` ${failures}` : ""}`,
      });
      setImportRows(null);
      await loadData();
    } catch (error) {
      showError(getErrorMessage(error, "CSV import failed."));
    } finally {
      setIsImporting(false);
    }
  }

  function showSuccess(message: string) {
    setFeedback({ kind: "success", message });
  }

  function showError(message: string) {
    setFeedback({ kind: "error", message });
  }

  function clearFeedback() {
    setFeedback(null);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-slate-800/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">Business Leads</h2>
          <p className="mt-1 text-sm text-slate-400">
            Add companies manually or import a CSV. No automated prospect discovery is used.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CompanyImport
            rows={importRows}
            onChooseFile={handleChooseCsv}
            onCancel={() => setImportRows(null)}
            onImport={handleImport}
            isImporting={isImporting}
          />
          <Button variant="outline" onClick={() => downloadCsvTemplate()} className="gap-2">
            <Download className="h-4 w-4" /> CSV Template
          </Button>
          <Button variant="outline" onClick={() => exportCompanies(filteredCompanies)} className="gap-2">
            <Download className="h-4 w-4" /> Export Filtered
          </Button>
          <CompanyFormModal onSave={handleSaveCompany} />
        </div>
      </div>

      {feedback && (
        <div className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${
          feedback.kind === "success"
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }`}>
          {feedback.kind === "success"
            ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <ScoringCriteriaForm
        key={JSON.stringify(criteria)}
        criteria={criteria}
        onSave={handleSaveCriteria}
        isSaving={isSavingCriteria}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          icon={<Search className="h-4 w-4" />}
          aria-label="Search company name"
          placeholder="Search company name"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <FilterSelect label="Industry" value={industryFilter} onChange={setIndustryFilter} options={industries} />
        <FilterSelect label="Location" value={locationFilter} onChange={setLocationFilter} options={locations} />
        <FilterSelect label="Company size" value={sizeFilter} onChange={setSizeFilter} options={[...COMPANY_SIZE_RANGES]} />
        <FilterSelect
          label="Pipeline stage"
          value={stageFilter}
          onChange={setStageFilter}
          options={[...LEAD_PIPELINE_STAGES, "Closed"]}
        />
        <FilterSelect
          label="Score range"
          value={scoreFilter}
          onChange={setScoreFilter}
          options={["low", "medium", "high"]}
          labels={{ low: "0–49", medium: "50–79", high: "80–100" }}
        />
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
          ))}
        </div>
      ) : filteredCompanies.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-slate-400">
          {companies.length ? "No companies match the selected filters." : "No business leads yet. Add a company or import your CSV."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredCompanies.map(({ company, score }) => (
            <CompanyCard
              key={company.id}
              company={company}
              score={score}
              onSaveCompany={handleSaveCompany}
              onDeleteCompany={handleDeleteCompany}
              onStageChange={handleStageChange}
              onSaveContact={handleSaveContact}
              onDeleteContact={handleDeleteContact}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ScoringCriteriaForm({
  criteria,
  onSave,
  isSaving,
}: {
  criteria: LeadGenerationCriteria;
  onSave: (criteria: LeadGenerationCriteria) => Promise<void>;
  isSaving: boolean;
}) {
  const [industries, setIndustries] = useState(criteria.industries.join(", "));
  const [locations, setLocations] = useState(criteria.locations.join(", "));
  const [companySizes, setCompanySizes] = useState<CompanySize[]>(criteria.company_sizes);

  function toggleSize(size: CompanySize) {
    setCompanySizes((current) =>
      current.includes(size) ? current.filter((entry) => entry !== size) : [...current, size],
    );
  }

  return (
    <Card className="space-y-4 border-slate-800 bg-slate-900/70 p-4">
      <div>
        <h3 className="font-semibold text-slate-100">Lead scoring criteria</h3>
        <p className="mt-1 text-xs text-slate-400">
          Score is deterministic: industry 40, location 25, size 20, and best contact completeness up to 15
          (5 for name, 5 for job title, 5 for email or LinkedIn URL). Needs ICP means all three target lists
          are not configured; otherwise Low Fit is 0–49, Medium Fit 50–79, and High Fit 80–100.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-400">
          Target industries (comma-separated)
          <Input value={industries} onChange={(event) => setIndustries(event.target.value)} placeholder="Technology, Healthcare" />
        </label>
        <label className="space-y-1 text-xs text-slate-400">
          Target locations (comma-separated)
          <Input value={locations} onChange={(event) => setLocations(event.target.value)} placeholder="New York, London" />
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs text-slate-400">Target company sizes</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {COMPANY_SIZE_RANGES.map((size) => (
            <label key={size} className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={companySizes.includes(size)}
                onChange={() => toggleSize(size)}
                className="accent-blue-500"
              />
              {size}
            </label>
          ))}
        </div>
      </fieldset>
      <Button
        size="sm"
        disabled={isSaving}
        onClick={() => void onSave({
          industries: splitCriteria(industries),
          locations: splitCriteria(locations),
          company_sizes: companySizes,
        })}
      >
        {isSaving ? "Saving criteria..." : "Save scoring criteria"}
      </Button>
    </Card>
  );
}

function CompanyCard({
  company,
  score,
  onSaveCompany,
  onDeleteCompany,
  onStageChange,
  onSaveContact,
  onDeleteContact,
}: {
  company: TargetCompany;
  score: ReturnType<typeof calculateLeadScore>;
  onSaveCompany: (values: CompanyFormValues, id?: string) => Promise<void>;
  onDeleteCompany: (company: TargetCompany) => Promise<void>;
  onStageChange: (id: string, stage: string) => Promise<void>;
  onSaveContact: (companyId: string, values: ContactFormValues, contactId?: string) => Promise<void>;
  onDeleteContact: (contact: CompanyContact) => Promise<void>;
}) {
  const [isContactsOpen, setIsContactsOpen] = useState(false);

  return (
    <Card className="space-y-4 border-slate-800 bg-slate-900 p-4">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-blue-500/30 bg-blue-600/20 text-blue-400">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-100">{company.name}</h3>
              <Badge variant={company.source_type === "CSV Import" ? "secondary" : "outline"}>
                {company.source_type || "Legacy"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {[company.industry, company.location, company.company_size].filter(Boolean).join(" · ") || "Company details not provided"}
            </p>
            {company.website && (
              <a className="mt-1 inline-block text-xs text-blue-400 hover:underline" href={company.website} target="_blank" rel="noreferrer">
                {company.website}
              </a>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StageSelect status={company.status} onChange={(stage) => void onStageChange(company.id, stage)} />
          <Badge variant={score.category === "High Fit" ? "default" : "secondary"}>
            {score.score}/100 · {score.category}
          </Badge>
          <CompanyFormModal company={company} onSave={onSaveCompany} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${company.name}`}
            onClick={() => void onDeleteCompany(company)}
            className="text-slate-400 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>Industry {score.breakdown.industry}/40</span>
          <span>Location {score.breakdown.location}/25</span>
          <span>Size {score.breakdown.companySize}/20</span>
          <span>Contact {score.breakdown.contactCompleteness}/15</span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsContactsOpen(true)} className="gap-2">
          <Users className="h-4 w-4" /> Contacts ({company.contacts.length})
        </Button>
      </div>
      <ContactManager
        company={company}
        isOpen={isContactsOpen}
        onClose={() => setIsContactsOpen(false)}
        onSave={onSaveContact}
        onDelete={onDeleteContact}
      />
    </Card>
  );
}

function ContactManager({
  company,
  isOpen,
  onClose,
  onSave,
  onDelete,
}: {
  company: TargetCompany;
  isOpen: boolean;
  onClose: () => void;
  onSave: (companyId: string, values: ContactFormValues, contactId?: string) => Promise<void>;
  onDelete: (contact: CompanyContact) => Promise<void>;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${company.name} contacts`} className="max-w-2xl">
      <div className="space-y-4">
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {company.contacts.length === 0 ? (
            <p className="py-5 text-center text-sm text-slate-500">No contacts saved for this company.</p>
          ) : company.contacts.map((contact) => (
            <ContactRow key={contact.id} contact={contact} onSave={onSave} onDelete={onDelete} companyId={company.id} />
          ))}
        </div>
        <div className="border-t border-slate-700/70 pt-4">
          <h4 className="mb-3 text-sm font-semibold text-slate-200">Add decision-maker contact</h4>
          <ContactForm onSave={(values) => onSave(company.id, values)} />
        </div>
        <p className="text-xs text-slate-500">
          Only add contact information you supplied or obtained through a permitted source. No LinkedIn scraping is performed.
        </p>
      </div>
    </Modal>
  );
}

function ContactRow({
  contact,
  companyId,
  onSave,
  onDelete,
}: {
  contact: CompanyContact;
  companyId: string;
  onSave: (companyId: string, values: ContactFormValues, contactId?: string) => Promise<void>;
  onDelete: (contact: CompanyContact) => Promise<void>;
}) {
  const [isEditing, setIsEditing] = useState(false);
  if (isEditing) {
    return (
      <div className="rounded-xl border border-slate-700/70 bg-slate-950/30 p-3">
        <ContactForm
          initial={{
            full_name: contact.full_name,
            job_title: contact.job_title || "",
            email: contact.email || "",
            phone: contact.phone || "",
            linkedin_profile_url: contact.linkedin_profile_url || "",
            verification_status: contact.verification_status,
          }}
          submitLabel="Save contact"
          onCancel={() => setIsEditing(false)}
          onSave={async (values) => {
            await onSave(companyId, values, contact.id);
            setIsEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-950/30 p-3">
      <div className="min-w-0">
        <p className="font-medium text-slate-200">{contact.full_name}</p>
        <p className="text-xs text-slate-500">
          {contact.job_title || "Role not provided"} · {contact.source_type} · {contact.verification_status}
        </p>
        <p className="mt-1 break-all text-xs text-slate-500">
          {[contact.email, contact.phone, contact.linkedin_profile_url].filter(Boolean).join(" · ") || "No contact details"}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <Button variant="ghost" size="icon" aria-label={`Edit ${contact.full_name}`} onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label={`Delete ${contact.full_name}`} onClick={() => void onDelete(contact)}>
          <Trash2 className="h-4 w-4 text-red-400" />
        </Button>
      </div>
    </div>
  );
}

function ContactForm({
  initial = EMPTY_CONTACT,
  submitLabel = "Add contact",
  onCancel,
  onSave,
}: {
  initial?: ContactFormValues;
  submitLabel?: string;
  onCancel?: () => void;
  onSave: (values: ContactFormValues) => Promise<void>;
}) {
  const [values, setValues] = useState(initial);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof ContactFormValues>(key: K, value: ContactFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(values);
      if (submitLabel === "Add contact") setValues(EMPTY_CONTACT);
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Could not save contact."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <Input required maxLength={200} value={values.full_name} onChange={(event) => update("full_name", event.target.value)} placeholder="Full name" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Input maxLength={160} value={values.job_title} onChange={(event) => update("job_title", event.target.value)} placeholder="Job title / role" />
        <Input type="email" maxLength={254} value={values.email} onChange={(event) => update("email", event.target.value)} placeholder="Email (optional)" />
        <Input maxLength={50} value={values.phone} onChange={(event) => update("phone", event.target.value)} placeholder="Phone (optional)" />
        <Input maxLength={500} value={values.linkedin_profile_url} onChange={(event) => update("linkedin_profile_url", event.target.value)} placeholder="LinkedIn profile URL (optional)" />
      </div>
      <label className="block space-y-1 text-xs text-slate-500">
        Verification
        <select
          value={values.verification_status}
          onChange={(event) => update("verification_status", event.target.value as ContactFormValues["verification_status"])}
          className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 text-sm text-slate-100"
        >
          <option value="Unverified">Unverified</option>
          <option value="Verified">Verified</option>
        </select>
      </label>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function CompanyFormModal({
  company,
  onSave,
}: {
  company?: TargetCompany;
  onSave: (values: CompanyFormValues, id?: string) => Promise<void>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<CompanyFormValues>(() => company ? companyToForm(company) : EMPTY_COMPANY);

  function update<K extends keyof CompanyFormValues>(key: K, value: CompanyFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave(values, company?.id);
      setIsOpen(false);
    } catch (saveError) {
      setError(getErrorMessage(saveError, "Could not save company."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {company ? (
        <Button
          variant="outline"
          size="icon"
          aria-label={`Edit ${company.name}`}
          onClick={() => {
            setValues(companyToForm(company));
            setError(null);
            setIsOpen(true);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          onClick={() => {
            setValues(EMPTY_COMPANY);
            setError(null);
            setIsOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Add Company
        </Button>
      )}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={company ? "Edit Company" : "Add Business Lead"}
        description="Company details are stored in your account."
      >
        <form onSubmit={submit} className="space-y-3">
          <Input required maxLength={200} value={values.name} onChange={(event) => update("name", event.target.value)} placeholder="Company name" />
          <Input maxLength={500} value={values.website} onChange={(event) => update("website", event.target.value)} placeholder="Website URL" />
          <Input maxLength={120} value={values.industry} onChange={(event) => update("industry", event.target.value)} placeholder="Industry" />
          <Input maxLength={200} value={values.location} onChange={(event) => update("location", event.target.value)} placeholder="Location" />
          <label className="block space-y-1 text-xs text-slate-500">
            Company size
            <select
              value={values.company_size}
              onChange={(event) => update("company_size", event.target.value as CompanyFormValues["company_size"])}
              className="h-10 w-full rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 text-sm text-slate-100"
            >
              <option value="">Select size</option>
              {COMPANY_SIZE_RANGES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Saving..." : company ? "Save changes" : "Save company"}
          </Button>
        </form>
      </Modal>
    </>
  );
}

function CompanyImport({
  rows,
  onChooseFile,
  onCancel,
  onImport,
  isImporting,
}: {
  rows: CompanyImportRow[] | null;
  onChooseFile: (file?: File) => void | Promise<void>;
  onCancel: () => void;
  onImport: () => void;
  isImporting: boolean;
}) {
  return (
    <>
      <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900 px-4 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-800">
        <Upload className="h-4 w-4" /> Import CSV
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            void onChooseFile(event.target.files?.[0]);
            event.currentTarget.value = "";
          }}
        />
      </label>
      <Modal isOpen={Boolean(rows)} onClose={onCancel} title="Preview CSV import" className="max-w-4xl">
        {rows && (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Review the first rows before import. Company name is required; unsupported company sizes will be reported as failures.
            </p>
            <div className="max-h-80 overflow-auto rounded-xl border border-slate-700/70">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead className="sticky top-0 bg-slate-800 text-slate-300">
                  <tr>{["Row", "Company name", "Website", "Industry", "Location", "Company size"].map((header) => <th key={header} className="p-2">{header}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 100).map((row, index) => (
                    <tr key={`${row.rowNumber}-${index}`} className="border-t border-slate-700/60">
                      <td className="p-2 text-slate-500">{row.rowNumber}</td>
                      {[row.name, row.website, row.industry, row.location, row.company_size].map((value, cell) => (
                        <td key={cell} className="max-w-48 truncate p-2 text-slate-300">{value || "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 100 && <p className="text-xs text-slate-500">Showing first 100 of {rows.length} rows.</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isImporting}>Cancel</Button>
              <Button onClick={onImport} disabled={isImporting || rows.length === 0}>
                {isImporting ? "Importing..." : `Import ${rows.length} rows`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  labels,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  labels?: Record<string, string>;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 pr-8 text-sm text-slate-100"
      >
        <option value="">All {label.toLowerCase()}s</option>
        {options.map((option) => (
          <option key={option} value={option}>{labels?.[option] || option}</option>
        ))}
      </select>
    </label>
  );
}

function StageSelect({ status, onChange }: { status: string; onChange: (value: string) => void }) {
  return (
    <select
      aria-label="Pipeline stage"
      value={status}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 max-w-36 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-200"
    >
      {[...LEAD_PIPELINE_STAGES, ...(status === "Closed" ? ["Closed"] : [])].map((stage) => (
        <option key={stage} value={stage}>{stage}</option>
      ))}
    </select>
  );
}

function companyToForm(company: TargetCompany): CompanyFormValues {
  return {
    name: company.name,
    website: company.website || "",
    industry: company.industry || "",
    location: company.location || "",
    company_size: company.company_size || "",
  };
}

function splitCriteria(value: string) {
  return [...new Set(value.split(",").map((entry) => entry.trim()).filter(Boolean))];
}

function uniqueValues(values: Array<string | null>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function exportCompanies(records: Array<{ company: TargetCompany; score: ReturnType<typeof calculateLeadScore> }>) {
  const headers = [
    "Company Name", "Website", "Industry", "Location", "Company Size", "Source", "Stage",
    "Score", "Score Category", "Industry Points", "Location Points", "Size Points", "Contact Points",
    "Contact Name", "Job Title", "Email", "Phone", "LinkedIn Profile", "Contact Source", "Verification",
  ];
  const rows = records.flatMap(({ company, score }) => {
    const contacts = company.contacts.length ? company.contacts : [null];
    return contacts.map((contact) => [
      company.name,
      company.website,
      company.industry,
      company.location,
      company.company_size,
      company.source_type,
      company.status,
      score.score,
      score.category,
      score.breakdown.industry,
      score.breakdown.location,
      score.breakdown.companySize,
      score.breakdown.contactCompleteness,
      contact?.full_name,
      contact?.job_title,
      contact?.email,
      contact?.phone,
      contact?.linkedin_profile_url,
      contact?.source_type,
      contact?.verification_status,
    ]);
  });
  downloadCsv([headers, ...rows], "business_leads.csv");
}

function downloadCsvTemplate() {
  downloadCsv([
    ["Company Name", "Website", "Industry", "Location", "Company Size"],
    ["Example Company", "https://example.com", "Technology", "New York", "Small (11-50)"],
  ], "business_leads_template.csv");
}

function downloadCsv(rows: unknown[][], filename: string) {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
