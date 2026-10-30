import { Sparkles } from "lucide-react";
import { useTranslate, type Identifier } from "ra-core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { Markdown } from "../misc/Markdown";
import { useAssistant } from "./useAssistant";

/** On the client 360 page: an AI briefing on the relationship, on request. */
export const AiSummaryCard = ({ companyId }: { companyId: Identifier }) => {
  const translate = useTranslate();
  const { run, isPending, error } = useAssistant();
  const [summary, setSummary] = useState<string | null>(null);

  const summarize = async () => {
    const result = await run({
      action: "summarize_company",
      company_id: companyId,
    });
    if (result?.text) setSummary(result.text);
  };

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
        <span className="mr-auto text-sm font-semibold">
          {translate("crm.ai.summary_title")}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={summarize}
        >
          {translate(summary ? "crm.ai.resummarize" : "crm.ai.summarize")}
        </Button>
      </div>
      {isPending ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      ) : summary ? (
        <Markdown className="mt-2 text-sm">{summary}</Markdown>
      ) : null}
    </div>
  );
};
