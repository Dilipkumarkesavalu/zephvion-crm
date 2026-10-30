import { formatDistanceToNow } from "date-fns";
import { Pencil, Plus, Trash2, Zap } from "lucide-react";
import {
  useCanAccess,
  useCreate,
  useDelete,
  useGetList,
  useNotify,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

import type { AutomationRule, AutomationRun } from "../types";
import { AutomationRuleDialog } from "./AutomationRuleDialog";
import { RULE_TEMPLATES, type RuleDraft } from "./automationModel";
import { RuleSentence } from "./RuleSentence";

/** Admin page: the rules, ready-made templates, and what ran recently. */
export const AutomationsPage = () => {
  const translate = useTranslate();
  const { canAccess: isAdmin } = useCanAccess({
    resource: "automation_rules",
    action: "edit",
  });
  const { data: rules = [] } = useGetList<AutomationRule>("automation_rules", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "id", order: "ASC" },
  });
  const [editing, setEditing] = useState<{
    rule?: AutomationRule;
    draft?: RuleDraft;
  } | null>(null);
  const usedNames = new Set(rules.map((rule) => rule.name));

  return (
    <div className="mx-auto mt-4 flex w-full max-w-4xl flex-col gap-4 pb-8">
      <div className="flex flex-wrap items-center gap-3">
        <Zap className="size-6 text-muted-foreground" />
        <div className="mr-auto">
          <h1 className="text-2xl font-semibold">
            {translate("crm.automations.title")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {translate("crm.automations.subtitle")}
          </p>
        </div>
        {isAdmin ? (
          <Button onClick={() => setEditing({})}>
            <Plus />
            {translate("crm.automations.new")}
          </Button>
        ) : null}
      </div>
      {!isAdmin ? (
        <p className="text-sm text-muted-foreground">
          {translate("crm.automations.admin_only")}
        </p>
      ) : null}

      {rules.length ? (
        <div className="flex flex-col gap-2">
          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              isAdmin={!!isAdmin}
              onEdit={() => setEditing({ rule })}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {translate("crm.automations.empty")}
        </p>
      )}

      {isAdmin ? (
        <TemplateList
          templates={RULE_TEMPLATES.filter(
            (template) => !usedNames.has(template.name),
          )}
          onPick={(draft) => setEditing({ draft })}
        />
      ) : null}

      <RecentRuns rules={rules} />

      {editing ? (
        <AutomationRuleDialog
          rule={editing.rule}
          draft={editing.draft}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
};

AutomationsPage.path = "/automations";

const RuleCard = ({
  rule,
  isAdmin,
  onEdit,
}: {
  rule: AutomationRule;
  isAdmin: boolean;
  onEdit: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [update, { isPending }] = useUpdate();
  const [deleteOne] = useDelete();
  return (
    <Card className="py-3">
      <CardContent className="flex flex-wrap items-center gap-3">
        <Switch
          checked={rule.is_active}
          disabled={!isAdmin || isPending}
          aria-label={translate(
            rule.is_active
              ? "crm.automations.active"
              : "crm.automations.paused",
          )}
          onCheckedChange={(checked) =>
            update("automation_rules", {
              id: rule.id,
              data: {
                is_active: checked,
                updated_at: new Date().toISOString(),
              },
              previousData: rule,
            })
          }
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium">{rule.name}</div>
          <RuleSentence rule={rule} className="text-sm text-muted-foreground" />
          <div className="text-xs text-muted-foreground">
            {rule.run_count
              ? `${translate("crm.automations.runs", {
                  smart_count: rule.run_count,
                })}${
                  rule.last_run_at
                    ? `, ${translate("crm.automations.last_run", {
                        date: formatDistanceToNow(new Date(rule.last_run_at), {
                          addSuffix: true,
                        }),
                      })}`
                    : ""
                }`
              : translate("crm.automations.never_run")}
          </div>
        </div>
        {isAdmin ? (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={translate("crm.automations.edit")}
              onClick={onEdit}
            >
              <Pencil className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={translate("ra.action.delete")}
              onClick={() =>
                deleteOne(
                  "automation_rules",
                  { id: rule.id, previousData: rule },
                  {
                    onSuccess: () =>
                      notify("crm.automations.deleted", { type: "info" }),
                  },
                )
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

const TemplateList = ({
  templates,
  onPick,
}: {
  templates: RuleDraft[];
  onPick: (draft: RuleDraft) => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const [create] = useCreate();
  if (!templates.length) return null;
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {translate("crm.automations.templates")}
      </h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {templates.map((template) => (
          <div
            key={template.name}
            className="flex items-start gap-3 rounded-lg border border-dashed p-3"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{template.name}</div>
              <RuleSentence
                rule={template}
                className="text-xs text-muted-foreground"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                onClick={() =>
                  create(
                    "automation_rules",
                    {
                      data: {
                        ...template,
                        is_active: true,
                        run_count: 0,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      },
                    },
                    {
                      onSuccess: () =>
                        notify("crm.automations.saved", { type: "success" }),
                    },
                  )
                }
              >
                {translate("crm.automations.add_template")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onPick(template)}
              >
                <Pencil className="size-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentRuns = ({ rules }: { rules: AutomationRule[] }) => {
  const translate = useTranslate();
  const { data: runs = [] } = useGetList<AutomationRun>("automation_runs", {
    pagination: { page: 1, perPage: 15 },
    sort: { field: "created_at", order: "DESC" },
  });
  const names = new Map(rules.map((rule) => [String(rule.id), rule.name]));
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {translate("crm.automations.recent_runs")}
      </h2>
      {runs.length ? (
        <ul className="divide-y rounded-md border text-sm">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center gap-3 px-3 py-2">
              <span className="min-w-0 flex-1 truncate">
                {names.get(String(run.rule_id)) ?? `#${run.rule_id}`}
                <span className="text-muted-foreground">
                  {" "}
                  · {run.resource} #{run.record_id}
                </span>
              </span>
              <span className="text-xs text-muted-foreground">
                {translate(`crm.automations.outcomes.${run.outcome}`, {
                  _: run.outcome,
                })}
              </span>
              <span className="w-28 text-right text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(run.created_at), {
                  addSuffix: true,
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {translate("crm.automations.no_runs")}
        </p>
      )}
    </div>
  );
};
