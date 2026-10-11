-- specs asc-legacy (docs/specs/asc-legacy.md) PO-LG-26 / OPEN-LG-12 / §4.1
-- `actionForConvocation` — match type column on public.match_details.
--
-- Values: 'friendly' | 'official'. Every EXISTING match is set to 'official'
-- (decided by PO-LG-26), no row deleted. The column stays NULLABLE with NO
-- default on purpose: a match created without a type must NEVER be read as
-- official (spec §4.1, same reason as AC-MS-07). SQL side of
-- actionForConvocation (see private.legacy_action_for_convocation in
-- 20261008100200_legacy_closure_and_reconciliation.sql) returns no action for
-- a match whose match_type is null.
--
-- Not added to the column-level UPDATE grant of match_details (that would be a
-- new write permission, outside this spec): setting the type on new matches is
-- a later create-convocation change (RPC / form), flagged in the report.
--
-- NOT APPLIED by the agent that wrote it: to be reviewed and applied by the
-- developer.

alter table public.match_details
  add column match_type text
  constraint match_details_match_type_check check (match_type in ('friendly', 'official'));

-- One-time backfill of the existing rows (PO-LG-26).
update public.match_details
   set match_type = 'official'
 where match_type is null;
