import { FunctionsHttpError } from '@supabase/supabase-js'
import { DomainError } from '@domain/errors/domain-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidUserInputError } from '@domain/errors/invalid-user-input-error'
import { InviteUserFailedError } from '@domain/errors/invite-user-failed-error'
import { UserAlreadyRegisteredError } from '@domain/errors/user-already-registered-error'
import { UserDirectoryInsertFailedError } from '@domain/errors/user-directory-insert-failed-error'
import type { InviteUserErrorDto } from '@data/dto/invite-user-dto'

// specs/web-users.md §2.5/AC-WU-34 — translates the invite-user Edge
// Function's error response into a DomainError, the same job
// map-supabase-error.ts does for a PostgrestError. `supabase.functions.invoke()`
// throws a FunctionsHttpError whose `.context` is the raw, UNCONSUMED fetch
// Response — this reads its JSON body once to get at the function's own
// `{ error, message? }` contract (data/dto/invite-user-dto.ts), mirrored
// manually on both sides of this call, never generated (CLAUDE.md §7).
export async function mapInviteFunctionError(error: unknown): Promise<DomainError> {
  if (!(error instanceof FunctionsHttpError)) {
    // A FunctionsFetchError (network) or FunctionsRelayError (Supabase's own
    // relay) — never the function's own body, nothing to parse.
    return new InviteUserFailedError('invite-user function call failed before returning a response')
  }

  let body: InviteUserErrorDto | null = null
  try {
    body = (await error.context.json()) as InviteUserErrorDto
  } catch {
    // Non-JSON or empty body — fall through to the generic mapping below.
  }

  switch (body?.error) {
    case 'unauthorized':
    case 'forbidden':
      // AC-WU-32 — the function itself verified the caller (or found no
      // valid session) and refused before touching service_role at all.
      return new ForbiddenError(body.message ?? 'Caller is not authorized to invite a user')
    case 'invalid_input':
      // Defence in depth only — InviteUserUseCase already validates
      // fullName/email before this call is ever made.
      return new InvalidUserInputError(body.message ?? 'fullName and email are required')
    case 'already_registered':
      return new UserAlreadyRegisteredError(body.message ?? 'This email is already invited or already registered')
    case 'directory_insert_failed':
      return new UserDirectoryInsertFailedError(body.message ?? 'Invitation sent but the public.users row could not be created')
    case 'server_misconfigured':
      // A deployment/config problem on the function's own side (missing
      // env var) — deliberately NOT a ForbiddenError: the caller did
      // nothing wrong and re-authenticating won't fix it. Falls into the
      // same generic InviteUserFailedError as an unrecognized error, which
      // is exactly the right copy here too ("something went wrong, try
      // later" rather than a false claim about permissions).
      return new InviteUserFailedError(body.message ?? 'invite-user function is missing its environment configuration')
    default:
      return new InviteUserFailedError(body?.message ?? 'invite-user function returned an unrecognized error')
  }
}
