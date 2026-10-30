import { FileSpreadsheet } from "lucide-react";
import {
  useDataProvider,
  useListContext,
  useNotify,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";

import { useConfigurationContext } from "../root/ConfigurationContext";
import type { Company, Invoice } from "../types";
import { buildZohoInvoicesCsv } from "./zohoExport";

const EXPORT_LIMIT = 5000;
// Lets Excel open the file as UTF-8 (₹ and Indian names)
const UTF8_BOM = String.fromCharCode(0xfeff);

/** Downloads the listed invoices as a CSV for Zoho Books' invoice import. */
export const ZohoExportButton = () => {
  const translate = useTranslate();
  const notify = useNotify();
  const dataProvider = useDataProvider();
  const { filterValues, sort } = useListContext();
  const { currency } = useConfigurationContext();
  const [isExporting, setIsExporting] = useState(false);

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const { data: invoices } = await dataProvider.getList<Invoice>(
        "invoices",
        {
          filter: { ...filterValues, type: "invoice" },
          sort,
          pagination: { page: 1, perPage: EXPORT_LIMIT },
        },
      );
      if (!invoices.length) {
        notify("resources.invoices.zoho.none", { type: "info" });
        return;
      }
      const { data: companies } = await dataProvider.getMany<Company>(
        "companies",
        { ids: [...new Set(invoices.map((invoice) => invoice.company_id))] },
      );
      const csv = buildZohoInvoicesCsv(invoices, companies, currency);
      const url = URL.createObjectURL(
        new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `zoho-books-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      notify("resources.invoices.zoho.exported", {
        type: "success",
        messageArgs: { smart_count: invoices.length },
      });
    } catch {
      notify("resources.invoices.notifications.error", { type: "error" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9"
      disabled={isExporting}
      onClick={exportCsv}
    >
      <FileSpreadsheet />
      {translate("resources.invoices.zoho.export")}
    </Button>
  );
};
