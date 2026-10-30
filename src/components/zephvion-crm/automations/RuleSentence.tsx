import { useGetList, useTranslate } from "ra-core";

import { useConfigurationContext } from "../root/ConfigurationContext";
import { formatSaleName } from "../sales/saleName";
import type { Sale } from "../types";
import {
  ANY,
  EVENT_CONDITION,
  getConditionValue,
  type RuleDraft,
} from "./automationModel";

/** "When a ticket is opened (Urgent), notify the record's owner." */
export const RuleSentence = ({
  rule,
  className,
}: {
  rule: Pick<RuleDraft, "event" | "condition" | "action" | "action_config">;
  className?: string;
}) => {
  const translate = useTranslate();
  const { dealStages } = useConfigurationContext();
  const { data: team = [] } = useGetList<Sale>("sales", {
    pagination: { page: 1, perPage: 200 },
    sort: { field: "id", order: "ASC" },
  });
  const { field, isDays } = EVENT_CONDITION[rule.event];
  const value = getConditionValue(rule);
  const condition = isDays
    ? `${value} days`
    : value === ANY
      ? translate("crm.automations.any")
      : field === "stage"
        ? (dealStages.find((stage) => stage.value === value)?.label ?? value)
        : translate(
            field === "source"
              ? `resources.leads.sources.${value}`
              : `resources.tickets.priorities.${value}`,
            { _: String(value) },
          );
  const recipientId = rule.action_config?.recipient ?? "owner";
  const person = team.find((sale) => String(sale.id) === recipientId);
  const recipient =
    recipientId === "owner" || !person
      ? translate("crm.automations.recipients.owner").toLowerCase()
      : formatSaleName(person);
  const action =
    rule.action === "create_task"
      ? `${translate("crm.automations.actions.create_task").toLowerCase()} for ${recipient}`
      : `notify ${recipient}`;

  return (
    <p className={className}>
      {translate(`crm.automations.events.${rule.event}`)}{" "}
      {isDays ? condition : `(${condition})`} → {action}
    </p>
  );
};
