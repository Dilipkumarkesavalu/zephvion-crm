/**
 * Issuer details printed on quotes and invoices.
 *
 * SAMPLE VALUES: replace the address, GSTIN, PAN, contact and bank details
 * with Zephvion's real registration details before issuing real documents.
 */
export const sellerDetails = {
  name: "Zephvion Pvt. Ltd.",
  addressLines: ["2nd Floor, Tech Park Road", "Bengaluru, Karnataka 560001"],
  /** Used to choose CGST+SGST (same state) or IGST (other states). */
  homeState: "Karnataka",
  state: "Karnataka (29)",
  gstin: "29AAACZ0000A1Z5",
  pan: "AAACZ0000A",
  email: "billing@zephvion.com",
  phone: "+91 00000 00000",
  website: "zephvion.com",
  bank: {
    accountName: "Zephvion Pvt. Ltd.",
    bankName: "Sample Bank",
    accountNumber: "000000000000",
    ifsc: "SMPL0000000",
  },
};

export const defaultQuoteNotes =
  "Prices are valid until the date above. 50% advance on acceptance, balance on delivery.";

export const defaultInvoiceNotes =
  "Payment due by the date above. Please quote the invoice number with your payment.";
