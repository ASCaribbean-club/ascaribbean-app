-- Coach feedback (2026-09-25): a coach must be able to create/save a match
-- convocation without knowing the RDV (meeting point) time/location yet —
-- these are logistics details often settled after the match itself is
-- scheduled, not always available up front. `match_details.meeting_point_time`
-- / `meeting_point_location` were `not null` since the initial schema
-- (20260821091519_convocation_creation_schema.sql) — relaxed here to
-- nullable. `isValidMatchSchedule` (domain/policies/match-scheduling-rules.ts)
-- is now only applied by the use cases (Create/UpdateMatchDetails) when a
-- meeting point time is actually provided.
alter table public.match_details
  alter column meeting_point_time drop not null,
  alter column meeting_point_location drop not null;
