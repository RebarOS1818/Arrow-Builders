"use client";

import { RecordForm } from "@/components/phases/record-form";
import { updateMember } from "@/app/(app)/teams/actions";
import type { Profile } from "@/lib/types";

const TRADES = [
  { value: "general", label: "General" },
  { value: "concrete", label: "Concrete" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishes", label: "Finishes" },
];

/**
 * Editing a person.
 *
 * Only what someone is called and what they do. Whether they are an admin is
 * refused by the database in two places and is deliberately absent here —
 * promoting somebody is a decision, not a field on a form.
 *
 * Initials are offered rather than required. Left blank they are derived from
 * the name, because initials that disagree with the name they abbreviate are
 * worse than initials nobody set.
 */
export function EditMemberForm({ member }: { member: Profile }) {
  return (
    <RecordForm
      edit
      triggerLabel="Edit"
      title={`Edit ${member.full_name}`}
      description="Admins can edit anyone here. Everyone else can edit themselves."
      submitLabel="Save"
      action={updateMember}
      fields={[
        { name: "id", label: "", type: "hidden", defaultValue: member.id },
        {
          name: "full_name",
          label: "Name",
          required: true,
          defaultValue: member.full_name,
          wide: true,
        },
        {
          name: "role",
          label: "Job title",
          defaultValue: member.role,
          placeholder: "Superintendent",
          hint: "What they do. Not what they may do — that is set separately.",
        },
        {
          name: "initials",
          label: "Initials",
          defaultValue: member.initials,
          hint: "Blank takes them from the name.",
        },
        {
          name: "trade",
          label: "Trade",
          type: "select",
          defaultValue: member.trade ?? "",
          options: TRADES,
        },
        {
          name: "on_site_today",
          label: "On site today",
          type: "checkbox",
          // "true" is what RecordForm compares against for a checked box; the
          // browser then submits "on" when it is ticked, which is what the
          // action reads.
          defaultValue: member.on_site_today ? "true" : "",
        },
      ]}
    />
  );
}
