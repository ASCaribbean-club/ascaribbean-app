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
