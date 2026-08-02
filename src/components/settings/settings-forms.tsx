"use client";

import { RecordForm } from "@/components/phases/record-form";
import { updateOrganization, updateProfile } from "@/app/(app)/settings/actions";
import type { Profile } from "@/lib/types";

const TRADES = [
  { value: "general", label: "General" },
  { value: "concrete", label: "Concrete" },
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "finishes", label: "Finishes" },
];

export function EditProfileForm({ profile }: { profile: Profile }) {
  return (
    <RecordForm
      triggerLabel="Edit profile"
      title="Edit your profile"
      submitLabel="Save"
      action={updateProfile}
      fields={[
        { name: "full_name", label: "Name", required: true, defaultValue: profile.full_name, wide: true },
        {
          name: "initials",
          label: "Initials",
          defaultValue: profile.initials,
          hint: "Left blank, taken from your name.",
        },
        {
          name: "trade",
          label: "Trade",
          type: "select",
          options: TRADES,
          defaultValue: profile.trade ?? "",
        },
        {
          name: "on_site_today",
          label: "On site today",
          type: "checkbox",
          defaultValue: profile.on_site_today ? "true" : "false",
          wide: true,
        },
      ]}
    />
  );
}

export function RenameOrgForm({
  name,
  canRename,
}: {
  name: string;
  canRename: boolean;
}) {
  return (
    <RecordForm
      triggerLabel="Rename"
      title="Rename organization"
      description="Shown throughout the app and on invitations you send."
      submitLabel="Save"
      action={updateOrganization}
      disabled={!canRename}
      disabledReason="Only admins can rename the organization"
      fields={[{ name: "name", label: "Name", required: true, defaultValue: name, wide: true }]}
    />
  );
}
