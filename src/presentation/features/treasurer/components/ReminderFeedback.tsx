import { Alert, AlertDescription } from "@presentation/shared/components/ui/alert";
import type { ReminderFeedback as ReminderFeedbackModel } from "../reminder-copy";

interface ReminderFeedbackProps {
  feedback: ReminderFeedbackModel | null;
  errorMessage: string | null;
}

// Result of a send, under the header: a non-blocking status (success or
// neutral "nothing sent") or a destructive alert when the call failed.
export function ReminderFeedback({ feedback, errorMessage }: ReminderFeedbackProps) {
  return (
    <>
      {feedback && (
        <Alert role="status" className="border-white/10 bg-white/10 text-white">
          <AlertDescription className="flex flex-col gap-0.5 text-white">
            {feedback.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </AlertDescription>
        </Alert>
      )}
      {errorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
