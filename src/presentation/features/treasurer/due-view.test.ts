import { describe, expect, it } from "vitest";
import { toDueEntry } from "@domain/rules/treasurer-dues-rules";
import { toDueView } from "./due-view";

const entry = toDueEntry(
  {
    membershipId: "m-1",
    memberName: "Joueur Test",
    amountDueCents: 10000,
    sections: [{ id: "s-1", name: "Seniors" }],
    payments: [{ id: "p-1", amountCents: 4000, paidAt: "2026-09-12", paymentMethod: null }],
    reminder: { count: 0, lastRemindedAt: null },
  },
  null,
);

describe("toDueView", () => {
  it("formats amounts, status, remaining and the payment history", () => {
    const view = toDueView(entry, true);
    expect(view).toMatchObject({
      initials: "JT",
      statusLabel: "Partielle",
      amountsLabel: "40€ / 100€",
      remainingLabel: "Reste 60€",
      sectionLabel: "Seniors",
      percent: 40,
    });
    expect(view.payments).toEqual([
      { id: "p-1", amountLabel: "40€", dateLabel: '12/09/2026', methodLabel: null },
    ]);
  });

  it("hides the section label when the section filter is not shown", () => {
    expect(toDueView(entry, false).sectionLabel).toBeNull();
  });

  it('labels a member without section "Sans section" when sections are shown', () => {
    expect(toDueView({ ...entry, sections: [] }, true).sectionLabel).toBe(
      "Sans section",
    );
  });

  it("has no remaining label once settled", () => {
    const settled = toDueEntry(
      {
        membershipId: "m",
        memberName: "Joueur Test",
        amountDueCents: 100,
        sections: [],
        payments: [{ id: "p", amountCents: 100, paidAt: "2026-09-01", paymentMethod: null }],
        reminder: { count: 0, lastRemindedAt: null },
      },
      null,
    );
    expect(toDueView(settled, false)).toMatchObject({
      remainingLabel: null,
      statusLabel: "Soldée",
      percent: 100,
    });
  });
});

describe("toDueView reminders", () => {
  const now = new Date(2026, 9, 14, 10, 0);
  const withReminder = (
    reminder: { count: number; lastRemindedAt: string | null },
    paid = 4000,
  ) =>
    toDueEntry(
      {
        membershipId: "m-r",
        memberName: "Joueur Test",
        amountDueCents: 10000,
        sections: [],
        payments:
          paid > 0
            ? [{ id: "p", amountCents: paid, paidAt: "2026-09-12", paymentMethod: null }]
            : [],
        reminder,
      },
      null,
    );

  it('shows "Jamais relancé" and an eligible button for a never-reminded unsettled card', () => {
    const view = toDueView(withReminder({ count: 0, lastRemindedAt: null }), false, now);
    expect(view).toMatchObject({
      reminderStateLabel: "Jamais relancé",
      isReminderEligible: true,
      reminderCooldownNotice: null,
    });
  });

  it("shows the history and an eligible button after a reminder older than 7 days", () => {
    const last = new Date(2026, 9, 5, 9, 0).toISOString();
    const view = toDueView(withReminder({ count: 2, lastRemindedAt: last }), false, now);
    expect(view.reminderStateLabel).toBe("2 relances · dernière il y a 9 j");
    expect(view.isReminderEligible).toBe(true);
  });

  it("replaces the button with a notice during the 7-day window", () => {
    const last = new Date(2026, 9, 12, 9, 0).toISOString();
    const view = toDueView(withReminder({ count: 1, lastRemindedAt: last }), false, now);
    expect(view.isReminderEligible).toBe(false);
    expect(view.reminderStateLabel).toBe("1 relance · dernière il y a 2 j");
    expect(view.reminderCooldownNotice).toContain("Relancé il y a 2 j · prochaine relance le");
  });

  it("has neither state line, button nor notice once settled", () => {
    const last = new Date(2026, 9, 12, 9, 0).toISOString();
    const view = toDueView(withReminder({ count: 1, lastRemindedAt: last }, 10000), false, now);
    expect(view).toMatchObject({
      reminderStateLabel: null,
      isReminderEligible: false,
      reminderCooldownNotice: null,
    });
  });
});
