import { DomainError } from './domain-error'

// Thrown by CreateConvocationUseCase when a convocation is created inside its
// closed response window (from the type's response deadline up to kickoff):
// players could no longer respond, so it is refused for everyone, admin
// included. Same minimal pattern as AttendanceWindowClosedError.
export class ConvocationCreationWindowClosedError extends DomainError {}
