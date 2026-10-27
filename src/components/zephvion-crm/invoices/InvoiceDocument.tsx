import { useGetOne, useTranslate } from "ra-core";

import { formatISODateString } from "../deals/dealUtils";
import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Contact, Invoice } from "../types";
import {
  amountInRupeeWords,
  computeTotals,
  formatMoney,
  getLineTax,
  getLineTaxable,
  getTaxLines,
} from "./invoiceModel";
import { sellerDetails } from "./sellerDetails";

/**
 * A4 document for a quote or tax invoice. Always rendered on a light "paper"
 * background, and the only thing visible when printing (see .print-area).
 */
export const InvoiceDocument = ({ invoice }: { invoice: Invoice }) => {
  const translate = useTranslate();
  const { currency, lightModeLogo } = useConfigurationContext();
  const { data: company } = useGetOne<Company>(
    "companies",
    { id: invoice.company_id },
    { enabled: invoice.company_id != null },
  );
  const { data: contact } = useGetOne<Contact>(
    "contacts",
    { id: invoice.contact_id! },
    { enabled: invoice.contact_id != null },
  );
  const { data: sourceQuote } = useGetOne<Invoice>(
    "invoices",
    { id: invoice.source_quote_id! },
    { enabled: invoice.source_quote_id != null },
  );

  const money = (amount: number) => formatMoney(amount, currency);
  const totals = computeTotals(invoice.items);
  const isQuote = invoice.type === "quote";
  const contactEmail = contact?.email_jsonb?.[0]?.email;
  const companyAddress = [
    company?.address,
    [company?.city, company?.state_abbr, company?.zipcode]
      .filter(Boolean)
      .join(", "),
    company?.country,
  ].filter(Boolean);

  return (
    <article className="print-area bg-white text-neutral-900 shadow-sm border rounded-lg mx-auto w-full max-w-[210mm] text-[13px] leading-relaxed">
      <div className="h-2 rounded-t-lg bg-[#0d82e4] print:rounded-none" />
      <div className="p-8 md:p-10 flex flex-col gap-8">
        <header className="flex flex-col sm:flex-row justify-between gap-6">
          <div className="flex flex-col gap-2">
            <img
              src={lightModeLogo}
              alt={sellerDetails.name}
              className="h-8 w-auto self-start"
            />
            <div className="text-neutral-600">
              {sellerDetails.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>GSTIN: {sellerDetails.gstin}</div>
              <div>
                {sellerDetails.email} · {sellerDetails.phone}
              </div>
            </div>
          </div>
          <div className="sm:text-right flex flex-col gap-1">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-[#0d82e4]">
              {translate(`resources.invoices.document_titles.${invoice.type}`)}
            </h2>
            <div className="font-semibold text-base">{invoice.number}</div>
            <MetaRow
              label={translate("resources.invoices.fields.issue_date")}
              value={formatISODateString(invoice.issue_date)}
            />
            {invoice.due_date ? (
              <MetaRow
                label={translate(
                  isQuote
                    ? "resources.invoices.fields.valid_until"
                    : "resources.invoices.fields.due_date",
                )}
                value={formatISODateString(invoice.due_date)}
              />
            ) : null}
            {sourceQuote ? (
              <div className="text-neutral-500 text-xs">
                {translate("resources.invoices.document.converted_from", {
                  number: sourceQuote.number,
                })}
              </div>
            ) : null}
          </div>
        </header>

        <section className="grid sm:grid-cols-2 gap-6">
          <div className="rounded-md bg-neutral-50 p-4">
            <SectionLabel>
              {translate("resources.invoices.sections.billing")}
            </SectionLabel>
            <div className="font-semibold text-base">
              {company?.name ?? "…"}
            </div>
            {companyAddress.map((line) => (
              <div key={line} className="text-neutral-600">
                {line}
              </div>
            ))}
            {company?.tax_identifier ? (
              <div className="text-neutral-600">
                GSTIN: {company.tax_identifier}
              </div>
            ) : null}
            {contact ? (
              <div className="mt-2 text-neutral-600">
                Attn: {contact.first_name} {contact.last_name}
                {contactEmail ? ` · ${contactEmail}` : ""}
              </div>
            ) : null}
          </div>
          <div className="rounded-md bg-neutral-50 p-4">
            <SectionLabel>
              {translate("resources.invoices.fields.tax_mode")}
            </SectionLabel>
            <div>
              {translate(`resources.invoices.tax_modes.${invoice.tax_mode}`)}
            </div>
            <div className="text-neutral-600">
              Place of supply: {company?.state_abbr || sellerDetails.state}
            </div>
            <div className="text-neutral-600">PAN: {sellerDetails.pan}</div>
          </div>
        </section>

        <section>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#0d82e4] text-white text-left text-xs uppercase tracking-wide">
                <th className="p-2 w-8">#</th>
                <th className="p-2">
                  {translate("resources.invoices.fields.description")}
                </th>
                <th className="p-2">
                  {translate("resources.invoices.fields.hsn_sac")}
                </th>
                <th className="p-2 text-right">
                  {translate("resources.invoices.fields.quantity")}
                </th>
                <th className="p-2 text-right">
                  {translate("resources.invoices.fields.unit_price")}
                </th>
                <th className="p-2 text-right">
                  {translate("resources.invoices.totals.subtotal")}
                </th>
                <th className="p-2 text-right">
                  {translate("resources.invoices.fields.gst_rate")}
                </th>
                <th className="p-2 text-right">
                  {translate("resources.invoices.fields.amount")}
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr
                  key={index}
                  className="border-b border-neutral-200 align-top"
                >
                  <td className="p-2 text-neutral-500">{index + 1}</td>
                  <td className="p-2">{item.description}</td>
                  <td className="p-2 text-neutral-600">{item.hsn_sac}</td>
                  <td className="p-2 text-right tabular-nums">
                    {item.quantity}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {money(item.unit_price)}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {money(getLineTaxable(item))}
                  </td>
                  <td className="p-2 text-right tabular-nums">
                    {item.gst_rate}%
                  </td>
                  <td className="p-2 text-right tabular-nums font-medium">
                    {money(getLineTaxable(item) + getLineTax(item))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col-reverse sm:flex-row justify-between gap-6 break-inside-avoid">
          <div className="flex-1 flex flex-col gap-4">
            {currency === "INR" ? (
              <div>
                <SectionLabel>
                  {translate("resources.invoices.totals.in_words")}
                </SectionLabel>
                <div className="font-medium">
                  {amountInRupeeWords(totals.total)}
                </div>
              </div>
            ) : null}
            {invoice.notes ? (
              <div>
                <SectionLabel>
                  {translate("resources.invoices.fields.notes")}
                </SectionLabel>
                <div className="whitespace-pre-line text-neutral-600">
                  {invoice.notes}
                </div>
              </div>
            ) : null}
            {!isQuote ? (
              <div>
                <SectionLabel>
                  {translate("resources.invoices.document.bank_details")}
                </SectionLabel>
                <div className="text-neutral-600">
                  {sellerDetails.bank.accountName} ·{" "}
                  {sellerDetails.bank.bankName}
                  <br />
                  A/c {sellerDetails.bank.accountNumber} · IFSC{" "}
                  {sellerDetails.bank.ifsc}
                </div>
              </div>
            ) : null}
          </div>
          <div className="sm:w-72 flex flex-col gap-1.5">
            <DocTotalRow
              label={translate("resources.invoices.totals.subtotal")}
              value={money(totals.subtotal)}
            />
            {getTaxLines(totals.taxByRate, invoice.tax_mode).map((line) => (
              <DocTotalRow
                key={line.label}
                label={line.label}
                value={money(line.amount)}
              />
            ))}
            <div className="mt-1 flex justify-between rounded-md bg-[#0d82e4]/10 px-3 py-2 text-base font-bold text-[#0a5fa6]">
              <span>{translate("resources.invoices.totals.total")}</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </div>
        </section>

        <footer className="flex justify-between items-end pt-6 border-t border-neutral-200 break-inside-avoid">
          <div className="text-neutral-500">
            {translate("resources.invoices.document.thanks")}
            <div className="text-xs">{sellerDetails.website}</div>
          </div>
          <div className="text-right">
            <div className="h-10" />
            <div className="font-medium">For {sellerDetails.name}</div>
            <div className="text-xs text-neutral-500">
              {translate("resources.invoices.document.signature")}
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-1">
    {children}
  </div>
);

const MetaRow = ({ label, value }: { label: string; value: string }) => (
  <div className="text-neutral-600">
    <span className="text-neutral-500">{label}: </span>
    {value}
  </div>
);

const DocTotalRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between px-3">
    <span className="text-neutral-600">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);
