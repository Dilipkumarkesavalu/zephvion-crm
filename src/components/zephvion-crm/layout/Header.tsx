import { User } from "lucide-react";
import { useTranslate, useUserMenu } from "ra-core";
import { Link, matchPath, useLocation } from "react-router";
import { RefreshButton } from "@/components/admin/refresh-button";
import { ThemeModeToggle } from "@/components/admin/theme-mode-toggle";
import { UserMenu } from "@/components/admin/user-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

import { NotificationBell } from "../organisation/NotificationBell";
import { GlobalSearchButton } from "../search/GlobalSearchButton";

/** Section name shown in the top bar, derived from the current route. */
const useSectionTitle = (): string => {
  const location = useLocation();
  const translate = useTranslate();
  const sections: Array<[string, string]> = [
    ["/leads/*", translate("resources.leads.name", { smart_count: 2 })],
    ["/contacts/*", translate("resources.contacts.name", { smart_count: 2 })],
    ["/companies/*", translate("resources.companies.name", { smart_count: 2 })],
    ["/deals/*", translate("resources.deals.name", { smart_count: 2 })],
    ["/invoices/*", translate("resources.invoices.name", { smart_count: 2 })],
    ["/tasks", translate("resources.tasks.name", { smart_count: 2 })],
    ["/reports", translate("crm.reports.title")],
    ["/automations", translate("crm.automations.title")],
    ["/tickets/*", translate("resources.tickets.name", { smart_count: 2 })],
    ["/projects/*", translate("resources.projects.name", { smart_count: 2 })],
    ["/receivables", translate("resources.invoices.receivables.title")],
    ["/sales/*", translate("resources.sales.name", { smart_count: 2 })],
    [
      "/departments/*",
      translate("resources.departments.name", { smart_count: 2 }),
    ],
    ["/audit_log", translate("crm.audit.title")],
    ["/settings", translate("crm.settings.title")],
    ["/profile", translate("crm.profile.title")],
  ];
  const match = sections.find(([pattern]) =>
    matchPath(pattern, location.pathname),
  );
  return match ? match[1] : translate("ra.page.dashboard");
};

const Header = () => {
  const sectionTitle = useSectionTitle();
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 data-[orientation=vertical]:h-4"
      />
      <h1 className="text-base font-semibold truncate">{sectionTitle}</h1>
      <div className="ml-auto flex items-center">
        <GlobalSearchButton />
        <NotificationBell />
        <ThemeModeToggle />
        <RefreshButton />
        <UserMenu>
          <ProfileMenu />
        </UserMenu>
      </div>
    </header>
  );
};

const ProfileMenu = () => {
  const translate = useTranslate();
  const userMenuContext = useUserMenu();
  if (!userMenuContext) {
    throw new Error("<ProfileMenu> must be used inside <UserMenu?");
  }
  return (
    <DropdownMenuItem asChild onClick={userMenuContext.onClose}>
      <Link to="/profile" className="flex items-center gap-2">
        <User />
        {translate("crm.profile.title")}
      </Link>
    </DropdownMenuItem>
  );
};

export default Header;
