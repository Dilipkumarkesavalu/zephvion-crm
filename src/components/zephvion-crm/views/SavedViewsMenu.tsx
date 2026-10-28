import { Bookmark, Check, Trash2, Users } from "lucide-react";
import {
  useCreate,
  useDelete,
  useGetIdentity,
  useGetList,
  useListContext,
  useNotify,
  useTranslate,
} from "ra-core";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import type { SavedView, SavedViewResource } from "../types";
import { cleanFilter, isSameFilter, splitViews } from "./savedViewModel";

const MAX_NAME_LENGTH = 60;

/**
 * "Views" button for list toolbars: apply a saved filter in one click, or
 * save the current filters for yourself or the whole team.
 */
export const SavedViewsMenu = ({
  resource,
}: {
  resource: SavedViewResource;
}) => {
  const translate = useTranslate();
  const { identity } = useGetIdentity();
  const { filterValues, setFilters } = useListContext();
  const [open, setOpen] = useState(false);
  const { data: views = [] } = useGetList<SavedView>("saved_views", {
    pagination: { page: 1, perPage: 100 },
    sort: { field: "name", order: "ASC" },
    filter: { resource },
  });
  const { mine, shared } = splitViews(views, identity?.id);
  const current = cleanFilter(filterValues ?? {});
  const activeView = views.find((view) => isSameFilter(view.filter, current));

  const apply = (view: SavedView) => {
    setFilters(view.filter, {});
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Bookmark className="size-4" />
          <span className="max-w-40 truncate">
            {activeView?.name ?? translate("crm.views.button")}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0">
        <ViewGroup
          title={translate("crm.views.mine")}
          views={mine}
          activeId={activeView?.id}
          onApply={apply}
          canDelete
        />
        <ViewGroup
          title={translate("crm.views.shared")}
          views={shared}
          activeId={activeView?.id}
          onApply={apply}
        />
        {mine.length === 0 && shared.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            {translate("crm.views.empty")}
          </p>
        ) : null}
        <SaveViewForm
          resource={resource}
          filter={current}
          isDisabled={Object.keys(current).length === 0 || !!activeView}
          onSaved={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
  );
};

const ViewGroup = ({
  title,
  views,
  activeId,
  onApply,
  canDelete = false,
}: {
  title: string;
  views: SavedView[];
  activeId?: SavedView["id"];
  onApply: (view: SavedView) => void;
  canDelete?: boolean;
}) => {
  const translate = useTranslate();
  const [deleteOne] = useDelete();
  if (!views.length) return null;
  return (
    <div className="border-b py-1">
      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <ul>
        {views.map((view) => (
          <li key={view.id} className="group flex items-center">
            <button
              type="button"
              onClick={() => onApply(view)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted/60",
                view.id === activeId && "font-medium",
              )}
            >
              <Check
                className={cn(
                  "size-3.5 shrink-0",
                  view.id === activeId ? "opacity-100" : "opacity-0",
                )}
              />
              <span className="truncate">{view.name}</span>
              {view.is_shared && canDelete ? (
                <Users
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label={translate("crm.views.shared_badge")}
                />
              ) : null}
            </button>
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="mr-1 size-7 opacity-60 hover:opacity-100"
                aria-label={translate("crm.views.delete", { name: view.name })}
                onClick={() =>
                  deleteOne("saved_views", { id: view.id, previousData: view })
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
};

const SaveViewForm = ({
  resource,
  filter,
  isDisabled,
  onSaved,
}: {
  resource: SavedViewResource;
  filter: Record<string, unknown>;
  isDisabled: boolean;
  onSaved: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const { identity } = useGetIdentity();
  const [create, { isPending }] = useCreate();
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const trimmed = name.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || isDisabled || identity?.id == null) return;
    create(
      "saved_views",
      {
        data: {
          resource,
          name: trimmed.slice(0, MAX_NAME_LENGTH),
          filter,
          is_shared: isShared,
          sales_id: identity.id,
          created_at: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setName("");
          setIsShared(false);
          notify("crm.views.saved", { type: "success" });
          onSaved();
        },
        onError: () => notify("crm.views.save_error", { type: "error" }),
      },
    );
  };

  return (
    <form onSubmit={submit} className="space-y-2 p-3">
      <Label htmlFor="saved-view-name" className="text-xs">
        {translate("crm.views.save_current")}
      </Label>
      <div className="flex gap-2">
        <Input
          id="saved-view-name"
          value={name}
          maxLength={MAX_NAME_LENGTH}
          placeholder={translate("crm.views.name_placeholder")}
          disabled={isDisabled}
          onChange={(event) => setName(event.target.value)}
          className="h-8"
        />
        <Button
          type="submit"
          size="sm"
          className="h-8"
          disabled={isDisabled || !trimmed || isPending}
        >
          {translate("ra.action.save")}
        </Button>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <Checkbox
          checked={isShared}
          disabled={isDisabled}
          onCheckedChange={(checked) => setIsShared(checked === true)}
        />
        {translate("crm.views.share")}
      </label>
      {isDisabled ? (
        <p className="text-xs text-muted-foreground">
          {translate("crm.views.hint")}
        </p>
      ) : null}
    </form>
  );
};
