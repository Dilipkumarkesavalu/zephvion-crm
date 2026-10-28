import {
  Building2,
  Handshake,
  History,
  Import,
  LayoutDashboard,
  Network,
  ReceiptText,
  Settings,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { CanAccess, useTranslate } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

import { ImportPage } from "../misc/ImportPage";
import { useConfigurationContext } from "../root/ConfigurationContext";

interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  /** Route pattern that marks the item active; defaults to `${to}/*`. */
  match?: string;
}

export const AppSidebar = () => {
  const translate = useTranslate();
  const { darkModeLogo, lightModeLogo, title } = useConfigurationContext();

  const workspaceItems: NavItem[] = [
    {
      to: "/",
      icon: LayoutDashboard,
      label: translate("ra.page.dashboard"),
      match: "/",
    },
    {
      to: "/contacts",
      icon: UsersRound,
      label: translate("resources.contacts.name", { smart_count: 2 }),
    },
    {
      to: "/companies",
      icon: Building2,
      label: translate("resources.companies.name", { smart_count: 2 }),
    },
    {
      to: "/deals",
      icon: Handshake,
      label: translate("resources.deals.name", { smart_count: 2 }),
    },
    {
      to: "/invoices",
      icon: ReceiptText,
      label: translate("resources.invoices.name", { smart_count: 2 }),
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b">
        <Link
          to="/"
          className="flex items-center gap-2 px-2 overflow-hidden"
          aria-label={title}
        >
          <img
            className="[.light_&]:hidden h-5 group-data-[collapsible=icon]:hidden"
            src={darkModeLogo}
            alt={title}
          />
          <img
            className="[.dark_&]:hidden h-5 group-data-[collapsible=icon]:hidden"
            src={lightModeLogo}
            alt={title}
          />
          <span className="border-l border-border pl-2 font-mono text-sm font-semibold tracking-[0.3em] group-data-[collapsible=icon]:hidden">
            CRM
          </span>
          <BrandMark className="hidden group-data-[collapsible=icon]:block size-6 shrink-0" />
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {workspaceItems.map((item) => (
                <NavMenuItem key={item.to} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>
            {translate("crm.settings.title")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <CanAccess resource="sales" action="list">
                <NavMenuItem
                  item={{
                    to: "/sales",
                    icon: Users,
                    label: translate("resources.sales.name", {
                      smart_count: 2,
                    }),
                  }}
                />
              </CanAccess>
              <CanAccess resource="departments" action="list">
                <NavMenuItem
                  item={{
                    to: "/departments",
                    icon: Network,
                    label: translate("resources.departments.name", {
                      smart_count: 2,
                    }),
                  }}
                />
              </CanAccess>
              <CanAccess resource="audit_log" action="list">
                <NavMenuItem
                  item={{
                    to: "/audit_log",
                    icon: History,
                    label: translate("crm.audit.title"),
                  }}
                />
              </CanAccess>
              <CanAccess resource="configuration" action="edit">
                <NavMenuItem
                  item={{
                    to: "/settings",
                    icon: Settings,
                    label: translate("crm.settings.title"),
                  }}
                />
              </CanAccess>
              <NavMenuItem
                item={{
                  to: ImportPage.path,
                  icon: Import,
                  label: translate("crm.header.import_data"),
                }}
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="text-xs text-muted-foreground px-4 pb-4 group-data-[collapsible=icon]:hidden">
        {title}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};

const NavMenuItem = ({ item }: { item: NavItem }) => {
  const location = useLocation();
  const isActive = !!matchPath(item.match ?? `${item.to}/*`, location.pathname);
  const Icon = item.icon;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
        <Link to={item.to}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
};

/** The circle-and-triangle "O" from the Zephvion wordmark. */
const BrandMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <circle
      cx="24"
      cy="24"
      r="19"
      fill="none"
      stroke="var(--primary)"
      strokeWidth="7"
    />
    <path d="M24 13L34 31H14Z" fill="var(--primary)" />
  </svg>
);
