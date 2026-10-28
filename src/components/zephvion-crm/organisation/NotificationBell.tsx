import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import {
  useDataProvider,
  useGetIdentity,
  useGetList,
  useTranslate,
  useUpdate,
  useUpdateMany,
} from "ra-core";
import { useState } from "react";
import { useNavigate } from "react-router";
import { ReferenceField } from "@/components/admin/reference-field";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { formatSaleName } from "../sales/saleName";
import type { Notification, Sale, Task } from "../types";

const REFRESH_MS = 30_000;
const SHOWN = 20;

const RECORD_PATHS: Record<string, string> = {
  leads: "/leads",
  deals: "/deals",
  contacts: "/contacts",
  companies: "/companies",
};

/** Header bell: recent assignments to the current user, newest first. */
export const NotificationBell = () => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const [open, setOpen] = useState(false);
  const { data: notifications = [] } = useGetList<Notification>(
    "notifications",
    {
      pagination: { page: 1, perPage: SHOWN },
      sort: { field: "created_at", order: "DESC" },
      filter: { recipient_sales_id: identity?.id },
    },
    { enabled: identity?.id != null, refetchInterval: REFRESH_MS },
  );
  const [updateMany] = useUpdateMany();
  const unread = notifications.filter((notification) => !notification.read_at);

  const markAllRead = () => {
    if (!unread.length) return;
    updateMany("notifications", {
      ids: unread.map((notification) => notification.id),
      data: { read_at: new Date().toISOString() },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={translate("crm.notifications.open")}
        >
          <Bell className="size-4" />
          {unread.length > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground">
              {unread.length}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">
            {translate("crm.notifications.title")}
          </span>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 text-xs"
            disabled={!unread.length}
            onClick={markAllRead}
          >
            {translate("crm.notifications.mark_all_read")}
          </Button>
        </div>
        {notifications.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {translate("crm.notifications.empty")}
          </p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={() => setOpen(false)}
              />
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
};

const NotificationItem = ({
  notification,
  onOpen,
}: {
  notification: Notification;
  onOpen: () => void;
}) => {
  const translate = useTranslate();
  const navigate = useNavigate();
  const dataProvider = useDataProvider();
  const [update] = useUpdate();
  const isUnread = !notification.read_at;

  const open = async () => {
    if (isUnread) {
      update("notifications", {
        id: notification.id,
        data: { read_at: new Date().toISOString() },
        previousData: notification,
      });
    }
    onOpen();
    if (notification.resource === "tasks") {
      // Tasks live on their contact's page
      const { data: task } = await dataProvider.getOne<Task>("tasks", {
        id: notification.record_id,
      });
      navigate(task?.contact_id ? `/contacts/${task.contact_id}/show` : "/");
      return;
    }
    const base = RECORD_PATHS[notification.resource];
    navigate(base ? `${base}/${notification.record_id}/show` : "/");
  };

  return (
    <li>
      <button
        type="button"
        onClick={open}
        className="flex w-full gap-3 px-4 py-3 text-left hover:bg-muted/60"
      >
        <span
          aria-hidden
          className={`mt-1.5 size-2 shrink-0 rounded-full ${isUnread ? "bg-primary" : "bg-transparent"}`}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">
            {notification.actor_sales_id != null ? (
              <ReferenceField<Notification, Sale>
                record={notification}
                source="actor_sales_id"
                reference="sales"
                link={false}
                render={({ referenceRecord }) =>
                  translate(
                    `crm.notifications.assigned.${notification.resource}`,
                    {
                      actor: referenceRecord
                        ? formatSaleName(referenceRecord as Sale)
                        : translate("crm.notifications.someone"),
                    },
                  )
                }
              />
            ) : (
              translate(`crm.notifications.assigned.${notification.resource}`, {
                actor: translate("crm.notifications.someone"),
              })
            )}
          </span>
          <span
            className={`block truncate text-sm ${isUnread ? "font-medium" : ""}`}
          >
            {notification.title}
          </span>
          <span className="block text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), {
              addSuffix: true,
            })}
          </span>
        </span>
      </button>
    </li>
  );
};
