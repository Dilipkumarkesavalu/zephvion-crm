import {
  amountInRupeeWords,
  computeTotals,
  getDisplayStatus,
  getNextDocumentNumber,
  getTaxLines,
  getTaxModeForState,
  sanitizeItems,
} from "./invoiceModel";

describe("computeTotals", () => {
  it("adds GST per line and groups tax by rate", () => {
    const totals = computeTotals([
      { description: "Website", quantity: 1, unit_price: 100000, gst_rate: 18 },
      { description: "Logo", quantity: 2, unit_price: 5000, gst_rate: 18 },
      { description: "Domain", quantity: 1, unit_price: 1000, gst_rate: 0 },
    ]);

    expect(totals.subtotal).toBe(111000);
    expect(totals.taxTotal).toBe(19800);
    expect(totals.total).toBe(130800);
    expect(totals.taxByRate).toEqual([
      { rate: 18, taxable: 110000, tax: 19800 },
    ]);
  });

  it("treats string and missing form values as numbers or zero", () => {
    const totals = computeTotals([
      // Form inputs can hand back strings or empty values while typing
      {
        description: "Hours",
        quantity: "3" as unknown as number,
        unit_price: 1500.5,
        gst_rate: 12,
      },
      { description: "Blank" },
    ]);

    expect(totals.subtotal).toBe(4501.5);
    expect(totals.taxTotal).toBe(540.18);
    expect(totals.total).toBe(5041.68);
  });

  it("returns zeros for an empty invoice", () => {
    expect(computeTotals(undefined)).toEqual({
      subtotal: 0,
      taxTotal: 0,
      total: 0,
      taxByRate: [],
    });
  });
});

describe("getTaxLines", () => {
  const taxByRate = [{ rate: 18, taxable: 1000, tax: 180.01 }];

  it("splits GST into CGST and SGST within a state, without losing a paisa", () => {
    const lines = getTaxLines(taxByRate, "intra");

    expect(lines.map((line) => line.label)).toEqual(["CGST @ 9%", "SGST @ 9%"]);
    expect(lines[0].amount + lines[1].amount).toBeCloseTo(180.01, 2);
  });

  it("uses a single IGST line across states", () => {
    expect(getTaxLines(taxByRate, "inter")).toEqual([
      { label: "IGST @ 18%", amount: 180.01 },
    ]);
  });
});

describe("sanitizeItems", () => {
  it("drops lines without a description and coerces numbers", () => {
    expect(
      sanitizeItems([
        {
          description: "  SEO retainer ",
          quantity: "2" as unknown as number,
          unit_price: 10,
          gst_rate: 18,
        },
        { description: "   ", quantity: 1, unit_price: 99, gst_rate: 18 },
      ]),
    ).toEqual([
      {
        description: "SEO retainer",
        hsn_sac: "",
        quantity: 2,
        unit_price: 10,
        gst_rate: 18,
      },
    ]);
  });
});

describe("getNextDocumentNumber", () => {
  const date = new Date(2026, 9, 26);

  it("continues the current year's sequence for the type", () => {
    expect(
      getNextDocumentNumber(
        "invoice",
        ["INV-2026-0007", "INV-2026-0012", "QT-2026-0040", "INV-2025-0099"],
        date,
      ),
    ).toBe("INV-2026-0013");
  });

  it("starts a new series at 0001", () => {
    expect(getNextDocumentNumber("quote", [], date)).toBe("QT-2026-0001");
  });
});

describe("getDisplayStatus", () => {
  const today = new Date(2026, 9, 26);

  it("marks sent invoices past their due date as overdue", () => {
    expect(
      getDisplayStatus(
        { type: "invoice", status: "sent", due_date: "2026-10-25" },
        today,
      ),
    ).toBe("overdue");
  });

  it("marks sent quotes past their validity as expired", () => {
    expect(
      getDisplayStatus(
        { type: "quote", status: "sent", due_date: "2026-10-01" },
        today,
      ),
    ).toBe("expired");
  });

  it("keeps the stored status when not past due or not sent", () => {
    expect(
      getDisplayStatus(
        { type: "invoice", status: "sent", due_date: "2026-10-26" },
        today,
      ),
    ).toBe("sent");
    expect(
      getDisplayStatus(
        { type: "invoice", status: "paid", due_date: "2026-01-01" },
        today,
      ),
    ).toBe("paid");
  });
});

describe("amountInRupeeWords", () => {
  it("uses the Indian numbering system", () => {
    expect(amountInRupeeWords(12345678.5)).toBe(
      "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight and Fifty Paise Only",
    );
  });

  it("handles round amounts and zero", () => {
    expect(amountInRupeeWords(118000)).toBe(
      "Rupees One Lakh Eighteen Thousand Only",
    );
    expect(amountInRupeeWords(0)).toBe("Rupees Zero Only");
  });
});

describe("getTaxModeForState", () => {
  it("uses CGST + SGST for clients in the issuer state and IGST elsewhere", () => {
    expect(getTaxModeForState("karnataka ", "Karnataka")).toBe("intra");
    expect(getTaxModeForState("Maharashtra", "Karnataka")).toBe("inter");
  });

  it("defaults to intra-state when the client state is unknown", () => {
    expect(getTaxModeForState(undefined, "Karnataka")).toBe("intra");
  });
});
