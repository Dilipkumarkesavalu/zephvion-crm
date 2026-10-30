import { Sparkles } from "lucide-react";
import { useTranslate } from "ra-core";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

import { Markdown } from "../misc/Markdown";
import type { ChatTurn } from "./assistantTypes";
import { useAssistant } from "./useAssistant";

/** Top-bar "Ask AI": questions about the CRM, answered from the user's records. */
export const AskAiSheet = () => {
  const translate = useTranslate();
  const { run, isPending, error } = useAssistant();
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const examples = translate("crm.ai.examples").split("|");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isPending]);

  const ask = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isPending) return;
    setQuestion("");
    const history = turns;
    setTurns([...history, { role: "user", content: trimmed }]);
    const result = await run({ action: "ask", question: trimmed, history });
    if (result?.text) {
      setTurns((current) => [
        ...current,
        { role: "assistant", content: result.text ?? "" },
      ]);
    } else {
      // Keep the question out of the history if it was not answered
      setTurns(history);
      setQuestion(trimmed);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    ask(question);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
          <span className="hidden md:inline">{translate("crm.ai.ask")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-violet-600" />
            {translate("crm.ai.ask_title")}
          </SheetTitle>
          <SheetDescription>{translate("crm.ai.ask_hint")}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="flex flex-col gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => ask(example)}
                  className="rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                >
                  {example}
                </button>
              ))}
            </div>
          ) : null}
          {turns.map((turn, index) => (
            <div
              key={index}
              className={cn(
                "max-w-[90%] rounded-lg px-3 py-2 text-sm",
                turn.role === "user"
                  ? "ml-auto bg-primary text-primary-foreground"
                  : "bg-muted",
              )}
            >
              {turn.role === "assistant" ? (
                <Markdown>{turn.content}</Markdown>
              ) : (
                turn.content
              )}
            </div>
          ))}
          {isPending ? (
            <p className="text-sm text-muted-foreground">
              {translate("crm.ai.thinking")}
            </p>
          ) : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div ref={endRef} />
        </div>
        <form onSubmit={submit} className="flex gap-2 border-t p-3">
          <Input
            value={question}
            maxLength={2000}
            placeholder={translate("crm.ai.ask_placeholder")}
            onChange={(event) => setQuestion(event.target.value)}
          />
          <Button type="submit" disabled={isPending || !question.trim()}>
            {translate("crm.ai.send")}
          </Button>
        </form>
        {turns.length ? (
          <Button
            variant="link"
            size="sm"
            className="mb-2 self-center"
            onClick={() => setTurns([])}
          >
            {translate("crm.ai.clear")}
          </Button>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
