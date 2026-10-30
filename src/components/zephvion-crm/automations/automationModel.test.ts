import {
  ANY,
  getConditionValue,
  RULE_TEMPLATES,
  toRuleRecord,
} from "./automationModel";

describe("toRuleRecord", () => {
  it("stores only the condition field the event uses", () => {
    expect(
      toRuleRecord({
        name: "  Won  ",
        event: "deal_stage_changed",
        condition: { stage: "won", priority: "urgent" },
        action: "notify",
        action_config: { recipient: "3", message: "Deal won" },
      }),
    ).toEqual({
      name: "Won",
      event: "deal_stage_changed",
      condition: { stage: "won" },
      action: "notify",
      action_config: { recipient: "3", message: "Deal won" },
    });
  });

  it("treats 'any' as no condition and keeps day counts in range", () => {
    expect(
      toRuleRecord({
        name: "x",
        event: "ticket_created",
        condition: { priority: ANY },
        action: "notify",
        action_config: {},
      }).condition,
    ).toEqual({});
    expect(
      toRuleRecord({
        name: "x",
        event: "deal_idle",
        condition: { days: 9999 },
        action: "notify",
        action_config: {},
      }).condition,
    ).toEqual({ days: 365 });
  });

  it("falls back to a notification for leads, which have no contact for a task", () => {
    const rule = toRuleRecord({
      name: "x",
      event: "lead_created",
      condition: {},
      action: "create_task",
      action_config: { task_text: "Call them", due_days: 2 },
    });

    expect(rule.action).toBe("notify");
    expect(rule.action_config).toEqual({ recipient: "owner", message: "" });
  });

  it("keeps task settings for task actions", () => {
    expect(
      toRuleRecord({
        name: "x",
        event: "deal_idle",
        condition: { days: 14 },
        action: "create_task",
        action_config: {
          task_text: " Follow up ",
          due_days: 2.6,
          task_type: "follow-up",
        },
      }).action_config,
    ).toEqual({
      recipient: "owner",
      task_text: "Follow up",
      task_type: "follow-up",
      due_days: 3,
    });
  });
});

describe("getConditionValue", () => {
  it("reads the event's field with sensible defaults", () => {
    expect(
      getConditionValue({
        event: "deal_stage_changed",
        condition: { stage: "won" },
      }),
    ).toBe("won");
    expect(getConditionValue({ event: "lead_created", condition: {} })).toBe(
      ANY,
    );
    expect(getConditionValue({ event: "invoice_overdue", condition: {} })).toBe(
      14,
    );
  });
});

describe("RULE_TEMPLATES", () => {
  it("are all valid as stored", () => {
    for (const template of RULE_TEMPLATES) {
      expect(toRuleRecord(template)).toEqual(template);
    }
  });
});
