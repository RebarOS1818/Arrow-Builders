"use client";

import { PROPERTY_TYPE_OPTIONS, STAGE_OPTIONS } from "@/lib/pipeline";
import { RecordForm, type Field } from "./record-form";
import {
  createComparable,
  createConstraint,
  createOffer,
  createProForma,
  createProperty,
  createStudy,
} from "@/app/(app)/development/actions";
import {
  createBidPackage,
  createChangeOrder,
  createContract,
  createQuote,
  createSubcontractor,
} from "@/app/(app)/construction/actions";

/**
 * The concrete forms, defined as field lists.
 *
 * Options that mirror a database enum are written out here rather than derived,
 * because the enum values are what the column accepts and a typo should fail at
 * build time in this file rather than at runtime in Postgres.
 */

const TRADES = [
  { value: "general", label: "General" },
  { value: "concrete", label: "Concrete" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishes", label: "Finishes" },
];

const hidden = (name: string, value: string): Field => ({
  name,
  label: "",
  type: "hidden",
  defaultValue: value,
});

/* ------------------------------------------------------------------ */
/* Development                                                         */
/* ------------------------------------------------------------------ */

export function NewPropertyForm() {
  return (
    <RecordForm
      triggerLabel="Add property"
      title="Add a property"
      description="A parcel you are assessing. It does not become a project until you decide to build."
      submitLabel="Add property"
      action={createProperty}
      fields={[
        // Pre-Planning holds what is knowable while a parcel is still a
        // candidate; Planning holds what only exists once it is being bought.
        // The address is the parcel's name. There is no separate title field:
        // one of the two always ends up stale, and it is never the address.
        { name: "address", label: "Address", type: "address", required: true, placeholder: "4545 Kings Highway", wide: true, tab: "Pre-Planning" },
        { name: "city", label: "City", tab: "Pre-Planning" },
        { name: "state", label: "State", placeholder: "VA", tab: "Pre-Planning" },
        { name: "parcel_number", label: "APN", hint: "Assessor's parcel number.", placeholder: "85698574", tab: "Pre-Planning" },
        {
          name: "property_type",
          label: "Property type",
          type: "select",
          options: PROPERTY_TYPE_OPTIONS,
          tab: "Pre-Planning",
        },
        { name: "lot_size_sqft", label: "Lot size (sqft)", type: "number", step: "1", tab: "Pre-Planning" },
        { name: "lot_size_acres", label: "Lot size (acres)", type: "number", step: "0.01", hint: "Kept separately: a listing quotes one or the other.", tab: "Pre-Planning" },
        { name: "zoning_code", label: "Zoning", placeholder: "R1", tab: "Pre-Planning" },
        { name: "asking_price", label: "Asking price", type: "money", tab: "Pre-Planning" },
        { name: "architect", label: "Architect", tab: "Pre-Planning" },
        { name: "notes", label: "Notes", type: "textarea", tab: "Pre-Planning" },

        { name: "acquisition_date", label: "Acquisition date", type: "date", tab: "Planning" },
        { name: "hard_cost_budget", label: "Hard cost budget", type: "money", hint: "Construction, as against the asking price.", tab: "Planning" },
        { name: "total_units_planned", label: "Total units planned", type: "number", step: "1", tab: "Planning" },
        { name: "broker", label: "Broker", tab: "Planning" },
        { name: "owner_name", label: "Owner", tab: "Planning" },
        {
          name: "status",
          label: "Acquisition status",
          type: "select",
          required: true,
          defaultValue: "prospecting",
          options: STAGE_OPTIONS,
          wide: true,
          tab: "Planning",
        },
      ]}
    />
  );
}

export function NewStudyForm({ propertyId }: { propertyId: string }) {
  return (
    <RecordForm
      triggerLabel="Order study"
      title="Order a feasibility study"
      description="One study per question. A verdict can only be recorded once it is complete."
      submitLabel="Add study"
      action={createStudy}
      fields={[
        hidden("property_id", propertyId),
        {
          name: "kind",
          label: "Study",
          type: "select",
          required: true,
          options: [
            { value: "zoning", label: "Zoning" },
            { value: "environmental", label: "Environmental" },
            { value: "geotechnical", label: "Geotechnical" },
            { value: "utilities", label: "Utilities" },
            { value: "traffic", label: "Traffic" },
            { value: "title", label: "Title" },
            { value: "survey", label: "Survey" },
            { value: "floodplain", label: "Floodplain" },
          ],
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "not_started",
          options: [
            { value: "not_started", label: "Not started" },
            { value: "in_progress", label: "In progress" },
            { value: "complete", label: "Complete" },
            { value: "blocked", label: "Blocked" },
          ],
        },
        {
          name: "verdict",
          label: "Verdict",
          type: "select",
          hint: "Only when the status is Complete.",
          options: [
            { value: "favorable", label: "Favorable" },
            { value: "conditional", label: "Conditional" },
            { value: "unfavorable", label: "Unfavorable" },
          ],
        },
        { name: "completed_at", label: "Completed on", type: "date" },
        { name: "consultant", label: "Consultant" },
        { name: "cost", label: "Cost", type: "money" },
        { name: "findings", label: "Findings", type: "textarea" },
      ]}
    />
  );
}

export function NewConstraintForm({ propertyId }: { propertyId: string }) {
  return (
    <RecordForm
      triggerLabel="Add constraint"
      title="Record a site constraint"
      submitLabel="Add constraint"
      action={createConstraint}
      fields={[
        hidden("property_id", propertyId),
        { name: "kind", label: "Constraint", required: true, placeholder: "Drainage easement" },
        {
          name: "severity",
          label: "Severity",
          type: "select",
          required: true,
          defaultValue: "minor",
          options: [
            { value: "informational", label: "Informational" },
            { value: "minor", label: "Minor" },
            { value: "major", label: "Major" },
            { value: "fatal", label: "Fatal" },
          ],
        },
        { name: "description", label: "Description", type: "textarea" },
        {
          name: "affects_buildable_area",
          label: "Reduces buildable area",
          type: "checkbox",
          wide: true,
        },
      ]}
    />
  );
}

export function NewProFormaForm({ propertyId }: { propertyId: string }) {
  return (
    <RecordForm
      triggerLabel="Add scenario"
      title="Add a pro forma scenario"
      description="Total cost and profit are computed by the database from these inputs — contingency applies to hard plus soft costs."
      submitLabel="Add scenario"
      action={createProForma}
      fields={[
        hidden("property_id", propertyId),
        { name: "scenario", label: "Scenario", required: true, defaultValue: "Base case", wide: true },
        { name: "planned_units", label: "Planned units", type: "number" },
        { name: "planned_sqft", label: "Planned sqft", type: "number" },
        { name: "acquisition_cost", label: "Acquisition cost", type: "money" },
        { name: "hard_costs", label: "Hard costs", type: "money" },
        { name: "soft_costs", label: "Soft costs", type: "money" },
        { name: "financing_costs", label: "Financing costs", type: "money" },
        { name: "contingency_pct", label: "Contingency %", type: "number", step: "0.1", hint: "Applied to hard + soft costs." },
        { name: "projected_revenue", label: "Projected revenue", type: "money" },
        { name: "target_margin_pct", label: "Target margin %", type: "number", step: "0.1" },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Draft" },
            { value: "under_review", label: "Under review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ],
        },
      ]}
    />
  );
}

export function NewComparableForm({ propertyId }: { propertyId: string }) {
  return (
    <RecordForm
      triggerLabel="Add comparable"
      title="Add a comparable sale"
      submitLabel="Add comparable"
      action={createComparable}
      fields={[
        hidden("property_id", propertyId),
        { name: "address", label: "Address", type: "address", required: true, wide: true },
        { name: "sale_price", label: "Sale price", type: "money" },
        { name: "sale_date", label: "Sale date", type: "date" },
        { name: "lot_size_acres", label: "Lot size (acres)", type: "number", step: "0.01" },
        { name: "building_sqft", label: "Building sqft", type: "number" },
        { name: "distance_miles", label: "Distance (miles)", type: "number", step: "0.1" },
        { name: "source", label: "Source", placeholder: "MLS, county records…" },
      ]}
    />
  );
}

export function NewOfferForm({ propertyId }: { propertyId: string }) {
  return (
    <RecordForm
      triggerLabel="Record offer"
      title="Record an offer"
      submitLabel="Record offer"
      action={createOffer}
      fields={[
        hidden("property_id", propertyId),
        { name: "amount", label: "Amount", type: "money", required: true },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
            { value: "countered", label: "Countered" },
            { value: "accepted", label: "Accepted" },
            { value: "rejected", label: "Rejected" },
            { value: "withdrawn", label: "Withdrawn" },
            { value: "expired", label: "Expired" },
          ],
        },
        { name: "offered_at", label: "Offered on", type: "date" },
        { name: "expires_at", label: "Expires", type: "date" },
        { name: "earnest_money", label: "Earnest money", type: "money" },
        { name: "due_diligence_days", label: "Diligence period (days)", type: "number" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

type Option = { value: string; label: string };

export function NewSubcontractorForm() {
  return (
    <RecordForm
      triggerLabel="Add subcontractor"
      title="Add a subcontractor"
      submitLabel="Add subcontractor"
      action={createSubcontractor}
      fields={[
        { name: "company_name", label: "Company", required: true },
        { name: "trade", label: "Trade", type: "select", required: true, defaultValue: "general", options: TRADES },
        { name: "contact_name", label: "Contact" },
        { name: "phone", label: "Phone" },
        { name: "email", label: "Email" },
        { name: "license_number", label: "Licence number" },
        {
          name: "insurance_expires_at",
          label: "Insurance expires",
          type: "date",
          hint: "The app warns 60 days out, and flags a lapse.",
        },
        { name: "is_approved", label: "Approved to work", type: "checkbox" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}

export function NewBidPackageForm({ projects }: { projects: Option[] }) {
  return (
    <RecordForm
      triggerLabel="New package"
      title="Create a bid package"
      submitLabel="Create package"
      action={createBidPackage}
      disabled={projects.length === 0}
      disabledReason="Create a project first"
      fields={[
        { name: "project_id", label: "Project", type: "select", required: true, options: projects },
        { name: "name", label: "Package", required: true, placeholder: "Foundations & flatwork" },
        { name: "trade", label: "Trade", type: "select", required: true, defaultValue: "general", options: TRADES },
        { name: "budget", label: "Budget", type: "money" },
        { name: "due_at", label: "Bids due", type: "date" },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Draft" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
            { value: "awarded", label: "Awarded" },
            { value: "cancelled", label: "Cancelled" },
          ],
        },
        { name: "scope_description", label: "Scope", type: "textarea" },
      ]}
    />
  );
}

export function NewQuoteForm({
  packages,
  subcontractors,
}: {
  packages: Option[];
  subcontractors: Option[];
}) {
  return (
    <RecordForm
      triggerLabel="Record quote"
      title="Record a quote"
      description="Exclusions are why the low bid is often not the cheapest job — worth filling in."
      submitLabel="Record quote"
      action={createQuote}
      disabled={packages.length === 0 || subcontractors.length === 0}
      disabledReason="Add a bid package and a subcontractor first"
      fields={[
        { name: "bid_package_id", label: "Package", type: "select", required: true, options: packages },
        {
          name: "subcontractor_id",
          label: "Subcontractor",
          type: "select",
          required: true,
          options: subcontractors,
        },
        { name: "amount", label: "Amount", type: "money", required: true },
        { name: "duration_days", label: "Duration (days)", type: "number" },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "received",
          options: [
            { value: "received", label: "Received" },
            { value: "shortlisted", label: "Shortlisted" },
            { value: "accepted", label: "Accepted" },
            { value: "rejected", label: "Rejected" },
            { value: "withdrawn", label: "Withdrawn" },
          ],
        },
        { name: "valid_until", label: "Valid until", type: "date" },
        { name: "inclusions", label: "Inclusions", type: "textarea" },
        { name: "exclusions", label: "Exclusions", type: "textarea" },
      ]}
    />
  );
}

export function NewContractForm({
  projects,
  subcontractors,
}: {
  projects: Option[];
  subcontractors: Option[];
}) {
  return (
    <RecordForm
      triggerLabel="New contract"
      title="Create a contract"
      submitLabel="Create contract"
      action={createContract}
      disabled={projects.length === 0 || subcontractors.length === 0}
      disabledReason="Add a project and a subcontractor first"
      fields={[
        { name: "project_id", label: "Project", type: "select", required: true, options: projects },
        {
          name: "subcontractor_id",
          label: "Subcontractor",
          type: "select",
          required: true,
          options: subcontractors,
        },
        { name: "contract_number", label: "Contract number", required: true, placeholder: "SC-2025-004" },
        { name: "title", label: "Title", required: true, placeholder: "Interior finishes" },
        { name: "trade", label: "Trade", type: "select", required: true, defaultValue: "general", options: TRADES },
        { name: "original_amount", label: "Amount", type: "money", required: true },
        { name: "retainage_pct", label: "Retainage %", type: "number", step: "0.1", defaultValue: "10" },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Draft" },
            { value: "sent", label: "Sent" },
            { value: "executed", label: "Executed" },
            { value: "in_progress", label: "In progress" },
            { value: "complete", label: "Complete" },
            { value: "terminated", label: "Terminated" },
          ],
        },
        { name: "starts_on", label: "Starts", type: "date" },
        { name: "ends_on", label: "Ends", type: "date" },
        { name: "notes", label: "Notes", type: "textarea" },
      ]}
    />
  );
}

export function NewChangeOrderForm({ contracts }: { contracts: Option[] }) {
  return (
    <RecordForm
      triggerLabel="Raise change order"
      title="Raise a change order"
      description="Numbering is per contract and assigned automatically. Enter a negative amount for a credit back to the owner."
      submitLabel="Raise change order"
      action={createChangeOrder}
      disabled={contracts.length === 0}
      disabledReason="Create a contract first"
      fields={[
        { name: "contract_id", label: "Contract", type: "select", required: true, options: contracts },
        {
          name: "reason",
          label: "Reason",
          type: "select",
          required: true,
          defaultValue: "owner_request",
          options: [
            { value: "owner_request", label: "Owner request" },
            { value: "unforeseen_condition", label: "Unforeseen condition" },
            { value: "design_error", label: "Design error" },
            { value: "code_requirement", label: "Code requirement" },
            { value: "weather", label: "Weather" },
            { value: "material_availability", label: "Material availability" },
            { value: "other", label: "Other" },
          ],
        },
        {
          name: "amount",
          label: "Amount",
          type: "money",
          required: true,
          hint: "Negative for a credit.",
        },
        { name: "days_impact", label: "Schedule impact (days)", type: "number", defaultValue: "0" },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Draft" },
            { value: "submitted", label: "Submitted" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "void", label: "Void" },
          ],
        },
        {
          name: "decided_at",
          label: "Decision date",
          type: "date",
          hint: "Required to approve or reject.",
        },
        { name: "description", label: "Description", type: "textarea", required: true },
      ]}
    />
  );
}
