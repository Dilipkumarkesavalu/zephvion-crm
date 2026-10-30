import { formatDistanceToNow } from "date-fns";
import { Copy, Globe, RefreshCw } from "lucide-react";
import {
  useDataProvider,
  useGetList,
  useNotify,
  useRecordContext,
  useRefresh,
  useTranslate,
} from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { AsideSection } from "../misc/AsideSection";
import type { Company, PortalAccess } from "../types";
import {
  buildPortalUrl,
  generatePortalToken,
  hashPortalToken,
} from "./portalLink";

/**
 * Company page panel: create the client's secret portal link, replace it,
 * or switch it off. The full link is shown only right after it is made,
 * because only its fingerprint is stored.
 */
export const CompanyPortalCard = () => {
  const translate = useTranslate();
  const company = useRecordContext<Company>();
  const notify = useNotify();
  const refresh = useRefresh();
  const dataProvider = useDataProvider();
  const [newLink, setNewLink] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const { data: links = [] } = useGetList<PortalAccess>(
    "portal_access",
    {
      filter: { company_id: company?.id, is_active: true },
      pagination: { page: 1, perPage: 1 },
      sort: { field: "id", order: "DESC" },
    },
    { enabled: company?.id != null },
  );
  const active = links[0];
  if (!company) return null;

  const switchOff = async () => {
    if (!active) return;
    await dataProvider.update("portal_access", {
      id: active.id,
      data: { is_active: false },
      previousData: active,
    });
  };

  const createLink = async () => {
    setIsBusy(true);
    try {
      // One working link per client: the old one stops working
      await switchOff();
      const token = generatePortalToken();
      await dataProvider.create("portal_access", {
        data: {
          company_id: company.id,
          token_hash: await hashPortalToken(token),
          is_active: true,
          created_at: new Date().toISOString(),
        },
      });
      setNewLink(buildPortalUrl(token));
      refresh();
    } catch {
      notify("crm.portal.error", { type: "error" });
    } finally {
      setIsBusy(false);
    }
  };

  const copy = async () => {
    if (!newLink) return;
    await navigator.clipboard?.writeText(newLink);
    notify("crm.portal.copied", { type: "success" });
  };

  return (
    <AsideSection title={translate("crm.portal.title")}>
      <div className="flex flex-col gap-2 text-sm">
        {newLink ? (
          <>
            <p className="text-xs text-muted-foreground">
              {translate("crm.portal.copy_now")}
            </p>
            <div className="flex gap-1">
              <Input value={newLink} readOnly className="h-8 text-xs" />
              <Button
                size="icon"
                variant="outline"
                className="size-8"
                onClick={copy}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </>
        ) : active ? (
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="size-3.5 text-emerald-600" />
            {active.last_used_at
              ? translate("crm.portal.last_opened", {
                  time: formatDistanceToNow(new Date(active.last_used_at), {
                    addSuffix: true,
                  }),
                })
              : translate("crm.portal.never_opened")}
          </p>
        ) : (
          <p className="text-muted-foreground">
            {translate("crm.portal.none")}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={createLink}
          >
            <RefreshCw className="size-3.5" />
            {translate(
              active || newLink ? "crm.portal.new_link" : "crm.portal.create",
            )}
          </Button>
          {active ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={async () => {
                await switchOff();
                setNewLink(null);
                refresh();
              }}
            >
              {translate("crm.portal.turn_off")}
            </Button>
          ) : null}
        </div>
      </div>
    </AsideSection>
  );
};
