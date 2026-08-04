"use client";

import { RecordForm, type Field } from "./record-form";
import {
  updateComparable,
  updateConstraint,
  updateOffer,
  updateProForma,
  updateProperty,
  updateStudy,
} from "@/app/(app)/development/actions";
import {
  updateBidPackage,
  updateChangeOrder,
  updateContract,
  updateQuote,
  updateSubcontractor,
} from "@/app/(app)/construction/actions";
import { updateTask } from "@/app/(app)/tasks/actions";
import { updateDocument } from "@/app/(app)/documents/actions";
import { DOCUMENT_CATEGORIES } from "@/lib/uploads";
import type {
  BidPackage,
  ChangeOrder,
  Comparable,
  Contract,
  DocumentRecord,
  FeasibilityStudy,
  Offer,
  ProForma,
  Property,
  Quote,
  SiteConstraint,
  Subcontractor,
  Task,
} from "@/lib/types";

/**
 * Edit forms for every record the app creates.
 *
 * Each one mirrors its create counterpart's fields and pre-fills from the row,
 * so the form is a view of the record rather than a blank slate that happens to
 * overwrite one. The id travels as a hidden field and the server filters on
 * org_id as well, so a tampered id matches nothing.
 *
 * Parentage is not editable here — a quote keeps its bid package, a change
 * order its contract. Re-parenting is a different operation with different
 * consequences, and doing it silently through an edit form is a good way to
 * lose a bid.
 */

const TRADES = [
  { value: "general", label: "General" },
  { value: "concrete", label: "Concrete" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishes", label: "Finishes" },
];

const id = (value: string): Field => ({
  name: "id",
  label: "",
  type: "hidden",
  defaultValue: value,
});

const hidden = (name: string, value: string): Field => ({
  name,
  label: "",
  type: "hidden",
  defaultValue: value,
});

/** Numbers reach the form as strings; null stays blank rather than "null". */
const n = (value: number | null | undefined) => (value === null || value === undefined ? "" : String(value));
/** Dates arrive as timestamps sometimes; the input wants YYYY-MM-DD. */
const d = (value: string | null | undefined) => value?.slice(0, 10) ?? "";

/* ------------------------------------------------------------------ */
/* Development                                                         */
/* ------------------------------------------------------------------ */

export function EditPropertyForm({ property }: { property: Property }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit property"
      submitLabel="Save"
      action={updateProperty}
      fields={[
        id(property.id),
        { name: "name", label: "Name", required: true, defaultValue: property.name, wide: true },
        { name: "address", label: "Address", type: "address", defaultValue: property.address },
        { name: "parcel_number", label: "Parcel number (APN)", defaultValue: property.parcel_number ?? "" },
        { name: "city", label: "City", defaultValue: property.city },
        { name: "state", label: "State", defaultValue: property.state },
        { name: "lot_size_acres", label: "Lot size (acres)", type: "number", step: "0.01", defaultValue: n(property.lot_size_acres) },
        { name: "zoning_code", label: "Zoning", defaultValue: property.zoning_code ?? "" },
        { name: "asking_price", label: "Asking price", type: "money", defaultValue: n(property.asking_price) },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: property.status,
          options: [
            { value: "prospect", label: "Prospect" },
            { value: "under_review", label: "Under review" },
            { value: "under_contract", label: "Under contract" },
            { value: "acquired", label: "Acquired" },
            { value: "passed", label: "Passed" },
          ],
        },
        { name: "notes", label: "Notes", type: "textarea", defaultValue: property.notes },
      ]}
    />
  );
}

export function EditStudyForm({ study, propertyId }: { study: FeasibilityStudy; propertyId: string }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit study"
      submitLabel="Save"
      action={updateStudy}
      fields={[
        id(study.id),
        hidden("property_id", propertyId),
        {
          name: "kind",
          label: "Kind",
          type: "select",
          required: true,
          defaultValue: study.kind,
          options: [
            "zoning", "environmental", "geotechnical", "utilities",
            "traffic", "title", "survey", "floodplain",
          ].map((v) => ({ value: v, label: v[0]!.toUpperCase() + v.slice(1) })),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          required: true,
          defaultValue: study.status,
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
          defaultValue: study.verdict ?? "",
          hint: "Only once the study is complete.",
          options: [
            { value: "favorable", label: "Favorable" },
            { value: "conditional", label: "Conditional" },
            { value: "unfavorable", label: "Unfavorable" },
          ],
        },
        { name: "completed_at", label: "Completed", type: "date", defaultValue: d(study.completed_at) },
        { name: "consultant", label: "Consultant", defaultValue: study.consultant },
        { name: "cost", label: "Cost", type: "money", defaultValue: n(study.cost) },
        { name: "findings", label: "Findings", type: "textarea", defaultValue: study.findings },
      ]}
    />
  );
}

export function EditConstraintForm({
  constraint,
  propertyId,
}: {
  constraint: SiteConstraint;
  propertyId: string;
}) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit constraint"
      submitLabel="Save"
      action={updateConstraint}
      fields={[
        id(constraint.id),
        hidden("property_id", propertyId),
        { name: "kind", label: "Kind", required: true, defaultValue: constraint.kind, wide: true },
        {
          name: "severity",
          label: "Severity",
          type: "select",
          required: true,
          defaultValue: constraint.severity,
          options: [
            { value: "informational", label: "Informational" },
            { value: "minor", label: "Minor" },
            { value: "major", label: "Major" },
            { value: "fatal", label: "Fatal" },
          ],
        },
        { name: "description", label: "Description", type: "textarea", defaultValue: constraint.description },
        {
          name: "affects_buildable_area",
          label: "Reduces buildable area",
          type: "checkbox",
          defaultValue: constraint.affects_buildable_area ? "true" : "false",
        },
        {
          name: "resolved",
          label: "Resolved",
          type: "checkbox",
          defaultValue: constraint.resolved ? "true" : "false",
        },
      ]}
    />
  );
}

export function EditProFormaForm({ proForma, propertyId }: { proForma: ProForma; propertyId: string }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit pro forma"
      description="Total cost and profit are computed in the database from these inputs."
      submitLabel="Save"
      action={updateProForma}
      fields={[
        id(proForma.id),
        hidden("property_id", propertyId),
        { name: "scenario", label: "Scenario", required: true, defaultValue: proForma.scenario },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: proForma.status,
          options: [
            { value: "draft", label: "Draft" },
            { value: "under_review", label: "Under review" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
          ],
        },
        { name: "planned_units", label: "Planned units", type: "number", defaultValue: n(proForma.planned_units) },
        { name: "planned_sqft", label: "Planned sqft", type: "number", defaultValue: n(proForma.planned_sqft) },
        { name: "acquisition_cost", label: "Acquisition", type: "money", defaultValue: n(proForma.acquisition_cost) },
        { name: "hard_costs", label: "Hard costs", type: "money", defaultValue: n(proForma.hard_costs) },
        { name: "soft_costs", label: "Soft costs", type: "money", defaultValue: n(proForma.soft_costs) },
        { name: "financing_costs", label: "Financing", type: "money", defaultValue: n(proForma.financing_costs) },
        { name: "contingency_pct", label: "Contingency %", type: "number", step: "0.1", defaultValue: n(proForma.contingency_pct) },
        { name: "projected_revenue", label: "Projected revenue", type: "money", defaultValue: n(proForma.projected_revenue) },
        { name: "target_margin_pct", label: "Target margin %", type: "number", step: "0.1", defaultValue: n(proForma.target_margin_pct) },
      ]}
    />
  );
}

export function EditComparableForm({
  comparable,
  propertyId,
}: {
  comparable: Comparable;
  propertyId: string;
}) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit comparable"
      submitLabel="Save"
      action={updateComparable}
      fields={[
        id(comparable.id),
        hidden("property_id", propertyId),
        { name: "address", label: "Address", type: "address", required: true, defaultValue: comparable.address, wide: true },
        { name: "sale_price", label: "Sale price", type: "money", defaultValue: n(comparable.sale_price) },
        { name: "sale_date", label: "Sale date", type: "date", defaultValue: d(comparable.sale_date) },
        { name: "lot_size_acres", label: "Lot size (acres)", type: "number", step: "0.01", defaultValue: n(comparable.lot_size_acres) },
        { name: "building_sqft", label: "Building sqft", type: "number", defaultValue: n(comparable.building_sqft) },
        { name: "distance_miles", label: "Distance (miles)", type: "number", step: "0.1", defaultValue: n(comparable.distance_miles) },
      ]}
    />
  );
}

export function EditOfferForm({ offer, propertyId }: { offer: Offer; propertyId: string }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit offer"
      submitLabel="Save"
      action={updateOffer}
      fields={[
        id(offer.id),
        hidden("property_id", propertyId),
        { name: "amount", label: "Amount", type: "money", required: true, defaultValue: n(offer.amount) },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: offer.status,
          options: [
            "draft", "submitted", "countered", "accepted", "rejected", "withdrawn", "expired",
          ].map((v) => ({ value: v, label: v[0]!.toUpperCase() + v.slice(1) })),
        },
        { name: "offered_at", label: "Offered", type: "date", defaultValue: d(offer.offered_at) },
        { name: "expires_at", label: "Expires", type: "date", defaultValue: d(offer.expires_at) },
        { name: "earnest_money", label: "Earnest money", type: "money", defaultValue: n(offer.earnest_money) },
        { name: "due_diligence_days", label: "Diligence days", type: "number", defaultValue: n(offer.due_diligence_days) },
        { name: "notes", label: "Notes", type: "textarea", defaultValue: offer.notes },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function EditSubcontractorForm({ subcontractor }: { subcontractor: Subcontractor }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit subcontractor"
      submitLabel="Save"
      action={updateSubcontractor}
      fields={[
        id(subcontractor.id),
        { name: "company_name", label: "Company", required: true, defaultValue: subcontractor.company_name, wide: true },
        { name: "trade", label: "Trade", type: "select", options: TRADES, defaultValue: subcontractor.trade },
        { name: "contact_name", label: "Contact", defaultValue: subcontractor.contact_name },
        { name: "email", label: "Email", defaultValue: subcontractor.email },
        { name: "phone", label: "Phone", defaultValue: subcontractor.phone },
        { name: "license_number", label: "Licence number", defaultValue: subcontractor.license_number ?? "" },
        {
          name: "insurance_expires_at",
          label: "Insurance expires",
          type: "date",
          defaultValue: d(subcontractor.insurance_expires_at),
        },
        {
          name: "is_approved",
          label: "Approved to bid",
          type: "checkbox",
          defaultValue: subcontractor.is_approved ? "true" : "false",
          wide: true,
        },
      ]}
    />
  );
}

export function EditBidPackageForm({ bidPackage }: { bidPackage: BidPackage }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit bid package"
      submitLabel="Save"
      action={updateBidPackage}
      fields={[
        id(bidPackage.id),
        { name: "name", label: "Name", required: true, defaultValue: bidPackage.name, wide: true },
        { name: "trade", label: "Trade", type: "select", options: TRADES, defaultValue: bidPackage.trade },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: bidPackage.status,
          options: ["draft", "open", "closed", "awarded", "cancelled"].map((v) => ({
            value: v,
            label: v[0]!.toUpperCase() + v.slice(1),
          })),
        },
        { name: "budget", label: "Budget", type: "money", defaultValue: n(bidPackage.budget) },
        { name: "due_at", label: "Bids due", type: "date", defaultValue: d(bidPackage.due_at) },
        { name: "scope_description", label: "Scope", type: "textarea", defaultValue: bidPackage.scope_description },
      ]}
    />
  );
}

export function EditQuoteForm({ quote }: { quote: Quote }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit quote"
      submitLabel="Save"
      action={updateQuote}
      fields={[
        id(quote.id),
        { name: "amount", label: "Amount", type: "money", required: true, defaultValue: n(quote.amount) },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: quote.status,
          options: ["received", "shortlisted", "accepted", "rejected", "withdrawn", "expired"].map(
            (v) => ({ value: v, label: v[0]!.toUpperCase() + v.slice(1) }),
          ),
        },
        { name: "duration_days", label: "Duration (days)", type: "number", defaultValue: n(quote.duration_days) },
        { name: "valid_until", label: "Valid until", type: "date", defaultValue: "" },
        { name: "exclusions", label: "Exclusions", type: "textarea", defaultValue: quote.exclusions },
      ]}
    />
  );
}

export function EditContractForm({ contract }: { contract: Contract }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title={`Edit ${contract.contract_number}`}
      submitLabel="Save"
      action={updateContract}
      fields={[
        id(contract.id),
        {
          name: "original_amount",
          label: "Original amount",
          type: "money",
          required: true,
          defaultValue: n(contract.original_amount),
          hint: "Approved change orders are added on top; they are not edited here.",
          wide: true,
        },
        { name: "trade", label: "Trade", type: "select", options: TRADES, defaultValue: contract.trade },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: contract.status,
          options: ["draft", "sent", "executed", "in_progress", "complete", "terminated"].map((v) => ({
            value: v,
            label: v.replace("_", " ").replace(/^./, (c) => c.toUpperCase()),
          })),
        },
        { name: "starts_on", label: "Starts", type: "date", defaultValue: d(contract.starts_on) },
        { name: "ends_on", label: "Ends", type: "date", defaultValue: d(contract.ends_on) },
        { name: "notes", label: "Notes", type: "textarea", defaultValue: "" },
      ]}
    />
  );
}

export function EditChangeOrderForm({ changeOrder }: { changeOrder: ChangeOrder }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title={`Edit change order ${changeOrder.number}`}
      submitLabel="Save"
      action={updateChangeOrder}
      fields={[
        id(changeOrder.id),
        { name: "description", label: "Description", required: true, defaultValue: changeOrder.description, wide: true },
        {
          name: "amount",
          label: "Amount",
          type: "money",
          required: true,
          defaultValue: n(changeOrder.amount),
          hint: "Negative for a credit.",
        },
        { name: "days_impact", label: "Days impact", type: "number", defaultValue: n(changeOrder.days_impact) },
        {
          name: "reason",
          label: "Reason",
          type: "select",
          defaultValue: changeOrder.reason,
          options: [
            "owner_request", "unforeseen_condition", "design_error",
            "code_requirement", "weather", "material_availability", "other",
          ].map((v) => ({
            value: v,
            label: v.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()),
          })),
        },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: changeOrder.status,
          options: ["draft", "submitted", "approved", "rejected", "void"].map((v) => ({
            value: v,
            label: v[0]!.toUpperCase() + v.slice(1),
          })),
        },
        {
          name: "decided_at",
          label: "Decided",
          type: "date",
          defaultValue: "",
          hint: "Required once approved or rejected.",
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Tasks and documents                                                 */
/* ------------------------------------------------------------------ */

export function EditTaskForm({
  task,
  projects,
}: {
  task: Task;
  projects: { id: string; name: string }[];
}) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit task"
      submitLabel="Save"
      action={updateTask}
      fields={[
        id(task.id),
        { name: "title", label: "Title", required: true, defaultValue: task.title, wide: true },
        {
          name: "project_id",
          label: "Project",
          type: "select",
          required: true,
          defaultValue: task.project_id,
          options: projects.map((p) => ({ value: p.id, label: p.name })),
        },
        { name: "trade", label: "Trade", type: "select", options: TRADES, defaultValue: task.trade },
        { name: "starts_at", label: "Starts", type: "date", defaultValue: d(task.starts_at) },
        { name: "ends_at", label: "Ends", type: "date", defaultValue: d(task.ends_at) },
        {
          name: "status",
          label: "Status",
          type: "select",
          defaultValue: task.status,
          options: [
            { value: "unscheduled", label: "Unscheduled" },
            { value: "scheduled", label: "Scheduled" },
            { value: "in_progress", label: "In progress" },
            { value: "blocked", label: "Blocked" },
            { value: "done", label: "Done" },
          ],
        },
        { name: "crew_size", label: "Crew size", type: "number", defaultValue: n(task.crew_size) },
      ]}
    />
  );
}

export function EditDocumentForm({
  document,
  projects,
}: {
  document: DocumentRecord;
  projects: { id: string; name: string }[];
}) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title="Edit document"
      description="Renames the record. The stored file itself is untouched."
      submitLabel="Save"
      action={updateDocument}
      fields={[
        id(document.id),
        { name: "name", label: "Name", required: true, defaultValue: document.name, wide: true },
        {
          name: "project_id",
          label: "Project",
          type: "select",
          required: true,
          defaultValue: document.project_id,
          options: projects.map((p) => ({ value: p.id, label: p.name })),
        },
        {
          name: "category",
          label: "Category",
          type: "select",
          defaultValue: document.category,
          options: DOCUMENT_CATEGORIES.map((c) => ({ value: c, label: c })),
        },
      ]}
    />
  );
}
