import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Welcome = () => (
  <Card className="border-primary/30 bg-gradient-to-br from-primary/10 to-transparent">
    <CardHeader className="px-4">
      <CardTitle>Zephvion CRM</CardTitle>
    </CardHeader>
    <CardContent className="px-4">
      <p className="text-sm mb-4">
        One structured system for your leads, clients, deals and follow-ups,
        built by{" "}
        <a href="https://zephvion.com" className="underline hover:no-underline">
          Zephvion
        </a>
        .
      </p>
      <p className="text-sm mb-4">
        This demo runs on sample data, so feel free to explore and edit. It
        resets on reload.
      </p>
      <p className="text-xs text-muted-foreground">
        Built on the open-source{" "}
        <a
          href="https://github.com/marmelab/atomic-crm"
          className="underline hover:no-underline"
        >
          Atomic CRM
        </a>{" "}
        (MIT).
      </p>
    </CardContent>
  </Card>
);
