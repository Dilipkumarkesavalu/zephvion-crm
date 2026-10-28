import {
  Building2,
  CheckSquare,
  FilePlus2,
  Handshake,
  History,
  Inbox,
  LayoutDashboard,
  Network,
  Plus,
  ReceiptText,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useCanAccess, useTranslate } from "ra-core";
import { useMemo } from "react";

import { CommandGroup, CommandItem } from "@/components/ui/command";

type CommandAction = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
};

/** Navigation and "create" shortcuts offered by the Ctrl+K palette. */
const useCommandActions = () => {
  const translate = useTranslate();
  // Users, departments, the audit log and settings are admin pages
  const { canAccess: isAdmin } = useCanAccess({
    resource: "sales",
    action: "list",
  });
  const plural = (resource: string) =>
    translate(`resources.${resource}.name`, { smart_count: 2 });

  return useMemo(() => {
    const goTo: CommandAction[] = [
      {
        id: "go.dashboard",
        label: translate("ra.page.dashboard"),
        to: "/",
        icon: LayoutDashboard,
      },
      {
        id: "go.leads",
        label: plural("leads"),
        to: "/leads",
        icon: Inbox,
      },
      {
        id: "go.contacts",
        label: plural("contacts"),
        to: "/contacts",
        icon: UsersRound,
      },
      {
        id: "go.companies",
        label: plural("companies"),
        to: "/companies",
        icon: Building2,
      },
      { id: "go.deals", label: plural("deals"), to: "/deals", icon: Handshake },
      {
        id: "go.tasks",
        label: plural("tasks"),
        to: "/tasks",
        icon: CheckSquare,
      },
      {
        id: "go.invoices",
        label: plural("invoices"),
        to: "/invoices",
        icon: ReceiptText,
      },
      ...(isAdmin
        ? [
            {
              id: "go.sales",
              label: plural("sales"),
              to: "/sales",
              icon: Users,
            },
            {
              id: "go.departments",
              label: plural("departments"),
              to: "/departments",
              icon: Network,
            },
            {
              id: "go.audit",
              label: translate("crm.audit.title"),
              to: "/audit_log",
              icon: History,
            },
            {
              id: "go.settings",
              label: translate("crm.settings.title"),
              to: "/settings",
              icon: Settings,
            },
          ]
        : []),
    ];
    const create: CommandAction[] = [
      {
        id: "new.lead",
        label: translate("resources.leads.action.new"),
        to: "/leads/create",
        icon: Plus,
      },
      {
        id: "new.contact",
        label: translate("crm.command.new_contact"),
        to: "/contacts/create",
        icon: Plus,
      },
      {
        id: "new.company",
        label: translate("crm.command.new_company"),
        to: "/companies/create",
        icon: Plus,
      },
      {
        id: "new.deal",
        label: translate("crm.command.new_deal"),
        to: "/deals/create",
        icon: Plus,
      },
      {
        id: "new.invoice",
        label: translate("crm.command.new_invoice"),
        to: "/invoices/create",
        icon: FilePlus2,
      },
    ];
    return { goTo, create };
    // plural is rebuilt each render from translate, which is the real input
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translate, isAdmin]);
};

const matches = (action: CommandAction, query: string) =>
  !query || action.label.toLowerCase().includes(query.toLowerCase());

/**
 * Palette groups for navigation and quick creation. With an empty query all
 * of them show; while typing only those whose label contains the query.
 */
export const CommandActions = ({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (url: string) => void;
}) => {
  const translate = useTranslate();
  const { goTo, create } = useCommandActions();
  const groups = [
    { heading: translate("crm.command.go_to"), actions: goTo },
    { heading: translate("crm.command.create"), actions: create },
  ]
    .map((group) => ({
      ...group,
      actions: group.actions.filter((action) => matches(action, query)),
    }))
    .filter((group) => group.actions.length > 0);

  return groups.map((group) => (
    <CommandGroup
      key={group.heading}
      heading={group.heading}
      className="[&_[cmdk-group-heading]]:text-sm"
    >
      {group.actions.map((action) => (
        <CommandItem
          key={action.id}
          value={action.id}
          onSelect={() => onSelect(action.to)}
          className="text-base"
        >
          <action.icon className="shrink-0" />
          {action.label}
        </CommandItem>
      ))}
    </CommandGroup>
  ));
};
