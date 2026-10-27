import { FilePlus2, Plus } from "lucide-react";
import { useGetIdentity } from "ra-core";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";

const getGreeting = (hour: number) => {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

export const DashboardGreeting = () => {
  const { identity } = useGetIdentity();
  const now = new Date();
  const firstName = identity?.fullName?.split(" ")[0];
  const isDemo = import.meta.env.VITE_IS_DEMO === "true";

  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <p className="text-sm text-muted-foreground">
          {now.toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">
          {getGreeting(now.getHours())}
          {firstName ? `, ${firstName}` : ""}
        </h2>
        {isDemo ? (
          <p className="text-xs text-muted-foreground mt-1">
            Demo workspace with sample data. Changes reset on reload.
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/deals/create">
            <Plus />
            New deal
          </Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/invoices/create" state={{ record: { type: "quote" } }}>
            <FilePlus2 />
            New quote
          </Link>
        </Button>
      </div>
    </div>
  );
};
