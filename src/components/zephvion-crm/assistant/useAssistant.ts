import { useDataProvider, useTranslate } from "ra-core";
import { useCallback, useState } from "react";

import type { CrmDataProvider } from "../providers/types";
import type { AssistantPayload, AssistantResult } from "./assistantTypes";

/** Calls the assistant and turns failures into a readable message. */
export const useAssistant = () => {
  const dataProvider = useDataProvider<CrmDataProvider>();
  const translate = useTranslate();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (payload: AssistantPayload): Promise<AssistantResult | null> => {
      setIsPending(true);
      setError(null);
      try {
        const result = await dataProvider.askAssistant(payload);
        if (!result.ok) {
          setError(
            translate(`crm.ai.failures.${result.reason ?? "model_error"}`, {
              _: translate("crm.ai.failures.model_error"),
            }),
          );
          return null;
        }
        return result;
      } catch {
        setError(translate("crm.ai.failures.model_error"));
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [dataProvider, translate],
  );

  return { run, isPending, error };
};
