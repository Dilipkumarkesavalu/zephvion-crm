import { useMemo } from "react";

import { useConfigurationContext } from "../root/ConfigurationContext";

export interface SellerBankDetails {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
}

/** Issuer details printed on quotes and invoices, editable in Settings. */
export interface SellerDetails {
  name: string;
  /** One line per row of the printed address. */
  address: string;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
  website: string;
  bank: SellerBankDetails;
}

/** Used to choose CGST+SGST (same state) or IGST (other states). */
export const SELLER_HOME_STATE = "Karnataka";
export const SELLER_STATE_LABEL = "Karnataka (29)";

// Public registration details. Bank details are kept out of the code (the
// repository is public) and entered in Settings, which stores them in the
// CRM database.
export const defaultSellerDetails: SellerDetails = {
  name: "Zephvion Pvt. Ltd.",
  address: [
    "Kuvempu Complex, 44, 2nd Main Rd, 3rd Block",
    "West of Chord Road, 3rd Stage, Basaveshwar Nagar",
    "Bengaluru, Karnataka 560079",
  ].join("\n"),
  gstin: "29AACCZ7938F1ZS",
  pan: "AACCZ7938F",
  email: "",
  phone: "",
  website: "zephvion.com",
  bank: {
    accountName: "Zephvion Pvt. Ltd.",
    bankName: "",
    accountNumber: "",
    ifsc: "",
  },
};

/** Saved Settings over the defaults, field by field. */
export const mergeSellerDetails = (
  saved: Partial<SellerDetails> | undefined,
): SellerDetails => ({
  ...defaultSellerDetails,
  ...saved,
  bank: { ...defaultSellerDetails.bank, ...saved?.bank },
});

export const useSellerDetails = (): SellerDetails => {
  const { seller } = useConfigurationContext();
  return useMemo(() => mergeSellerDetails(seller), [seller]);
};

export const defaultQuoteNotes =
  "Prices are valid until the date above. 50% advance on acceptance, balance on delivery.";

export const defaultInvoiceNotes =
  "Payment due by the date above. Please quote the invoice number with your payment.";
