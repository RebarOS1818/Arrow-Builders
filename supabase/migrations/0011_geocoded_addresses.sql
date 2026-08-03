-- Coordinates for addresses chosen from autocomplete.
--
-- A text address is only ever as good as Google's later guess at it: "3900 Cedar
-- Hollow Rd" with a typo, or a rural parcel with no street number, lands
-- somewhere plausible rather than somewhere correct. When the address came from
-- a picked suggestion we already know the exact point, so it is worth keeping.
--
-- Both columns stay null for a typed address. Null means "we do not know",
-- which is honest; a guessed coordinate would not be.
--
-- Safe to run more than once.

alter table properties
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

alter table comparables
  add column if not exists latitude numeric(9, 6),
  add column if not exists longitude numeric(9, 6);

-- Latitude runs to ±90 and longitude to ±180. Out-of-range values mean the two
-- were swapped, which is the single most common way coordinate data goes wrong
-- and is silent without this.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'properties_coords_in_range'
  ) then
    alter table properties add constraint properties_coords_in_range check (
      (latitude is null or latitude between -90 and 90)
      and (longitude is null or longitude between -180 and 180)
    );
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'comparables_coords_in_range'
  ) then
    alter table comparables add constraint comparables_coords_in_range check (
      (latitude is null or latitude between -90 and 90)
      and (longitude is null or longitude between -180 and 180)
    );
  end if;
end $$;
