-- What a building has sold, computed rather than typed.
--
-- The three figures the acquisition side asks of a building — how many units,
-- how many sold, how much they brought in — are all already in `units`. Storing
-- them again on `buildings` would mean two places that can disagree, and the
-- one that disagrees is always the copy: a unit closes, somebody forgets to
-- update the building, and the revenue figure is quietly wrong from then on.
--
-- Same shape as contract_totals in 0009, for the same reason.
--
-- Safe to run more than once.

create or replace view building_totals as
  select
    b.id as building_id,
    b.org_id,
    b.project_id,
    count(u.id) as unit_count,
    count(u.id) filter (where u.status = 'sold') as units_sold,
    -- Revenue is what closed, not what was asked. `list_price` is an
    -- aspiration; only `sold_price` is money that arrived, and a unit can close
    -- above or below its list.
    coalesce(sum(u.sold_price) filter (where u.status = 'sold'), 0) as sales_revenue,
    coalesce(sum(u.list_price) filter (where u.status <> 'sold'), 0) as unsold_list_value
  from buildings b
  left join units u on u.building_id = b.id
  group by b.id;

-- The view runs as the caller, so the underlying tables' policies still apply
-- and it cannot be used to read another organization's buildings.
alter view building_totals set (security_invoker = on);
