import {
  useCreate,
  useGetList,
  useNotify,
  useTranslate,
  useUpdate,
} from "ra-core";
import { useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import {
  AUTOMATION_EVENTS,
  LEAD_SOURCES,
  TICKET_PRIORITIES,
  type AutomationAction,
  type AutomationEvent,
  type AutomationRule,
  type Sale,
} from "../types";
import {
  ANY,
  canCreateTask,
  EVENT_CONDITION,
  getConditionValue,
  RULE_TEMPLATES,
  toRuleRecord,
  type RuleDraft,
} from "./automationModel";

const BLANK: RuleDraft = { ...RULE_TEMPLATES[0], name: "" };

/** Create or edit one rule: when, only if, then, who. */
export const AutomationRuleDialog = ({
  rule,
  draft,
  onClose,
}: {
  rule?: AutomationRule;
  draft?: RuleDraft;
  onClose: () => void;
}) => {
  const translate = useTranslate();
  const notify = useNotify();
  const { dealStages, taskTypes } = useConfigurationContext();
  const { data: team = [] } = useGetList<Sale>("sales", {
    filter: { "disabled@neq": true },
    pagination: { page: 1, perPage: 200 },
    sort: { field: "first_name", order: "ASC" },
  });
  const [create, { isPending: isCreating }] = useCreate();
  const [update, { isPending: isUpdating }] = useUpdate();
  const [values, setValues] = useState<RuleDraft>(() => {
    const start = rule ?? draft ?? BLANK;
    return {
      name: start.name,
      event: start.event,
      condition: {
        [EVENT_CONDITION[start.event].field]: getConditionValue(start),
      },
      action: start.action,
      action_config: {
        recipient: "owner",
        due_days: 1,
        ...start.action_config,
      },
    };
  });
  const { field, isDays } = EVENT_CONDITION[values.event];
  const conditionValue = String(values.condition[field] ?? ANY);
  const config = values.action_config;
  const setConfig = (patch: Partial<RuleDraft["action_config"]>) =>
    setValues({ ...values, action_config: { ...config, ...patch } });

  const conditionChoices: Array<{ value: string; label: string }> =
    field === "stage"
      ? dealStages.map(({ value, label }) => ({ value, label }))
      : field === "source"
        ? LEAD_SOURCES.map((value) => ({
            value,
            label: translate(`resources.leads.sources.${value}`),
          }))
        : TICKET_PRIORITIES.map((value) => ({
            value,
            label: translate(`resources.tickets.priorities.${value}`),
          }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!values.name.trim()) return;
    const data = {
      ...toRuleRecord(values),
      updated_at: new Date().toISOString(),
    };
    const options = {
      onSuccess: () => {
        notify("crm.automations.saved", { type: "success" });
        onClose();
      },
    };
    if (rule) {
      update(
        "automation_rules",
        { id: rule.id, data, previousData: rule },
        options,
      );
    } else {
      create(
        "automation_rules",
        {
          data: {
            ...data,
            is_active: true,
            run_count: 0,
            created_at: new Date().toISOString(),
          },
        },
        options,
      );
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {translate(rule ? "crm.automations.edit" : "crm.automations.new")}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Field label={translate("crm.automations.fields.name")}>
            <Input
              value={values.name}
              maxLength={120}
              required
              onChange={(e) => setValues({ ...values, name: e.target.value })}
            />
          </Field>
          <Field label={translate("crm.automations.fields.event")}>
            <Select
              value={values.event}
              onValueChange={(value) => {
                const nextEvent = value as AutomationEvent;
                const next = EVENT_CONDITION[nextEvent];
                setValues({
                  ...values,
                  event: nextEvent,
                  condition: { [next.field]: next.isDays ? 14 : ANY },
                  action: canCreateTask(nextEvent) ? values.action : "notify",
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUTOMATION_EVENTS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {translate(`crm.automations.events.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {isDays ? (
            <Field
              label={translate("crm.automations.fields.days")}
              hint={translate("crm.automations.daily_hint")}
            >
              <Input
                type="number"
                min={1}
                max={365}
                value={conditionValue}
                onChange={(e) =>
                  setValues({
                    ...values,
                    condition: { [field]: e.target.value },
                  })
                }
              />
            </Field>
          ) : (
            <Field label={translate("crm.automations.fields.condition")}>
              <Select
                value={conditionValue}
                onValueChange={(value) =>
                  setValues({ ...values, condition: { [field]: value } })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY}>
                    {translate("crm.automations.any")}
                  </SelectItem>
                  {conditionChoices.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={translate("crm.automations.fields.action")}>
              <Select
                value={values.action}
                onValueChange={(value) =>
                  setValues({ ...values, action: value as AutomationAction })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notify">
                    {translate("crm.automations.actions.notify")}
                  </SelectItem>
                  {canCreateTask(values.event) ? (
                    <SelectItem value="create_task">
                      {translate("crm.automations.actions.create_task")}
                    </SelectItem>
                  ) : null}
                </SelectContent>
              </Select>
            </Field>
            <Field label={translate("crm.automations.fields.recipient")}>
              <Select
                value={config.recipient ?? "owner"}
                onValueChange={(value) => setConfig({ recipient: value })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">
                    {translate("crm.automations.recipients.owner")}
                  </SelectItem>
                  {team.map((sale) => (
                    <SelectItem key={sale.id} value={String(sale.id)}>
                      {formatSaleName(sale)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          {values.action === "notify" ? (
            <Field label={translate("crm.automations.fields.message")}>
              <Input
                value={config.message ?? ""}
                maxLength={120}
                onChange={(e) => setConfig({ message: e.target.value })}
              />
            </Field>
          ) : (
            <>
              <Field
                label={translate("crm.automations.fields.task_text")}
                hint={translate("crm.automations.task_hint")}
              >
                <Input
                  value={config.task_text ?? ""}
                  maxLength={300}
                  onChange={(e) => setConfig({ task_text: e.target.value })}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={translate("crm.automations.fields.task_type")}>
                  <Select
                    value={config.task_type ?? "none"}
                    onValueChange={(value) => setConfig({ task_type: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {taskTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={translate("crm.automations.fields.due_days")}>
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={config.due_days ?? 1}
                    onChange={(e) =>
                      setConfig({ due_days: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {translate("ra.action.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={!values.name.trim() || isCreating || isUpdating}
            >
              {translate("ra.action.save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const Field = ({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
    {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
  </div>
);
