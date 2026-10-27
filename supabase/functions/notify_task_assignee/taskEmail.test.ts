// @vitest-environment node
import { describe, expect, it } from "vitest";
import { buildTaskEmail, formatDueDate } from "./taskEmail";

const baseInput = {
  assigneeFirstName: "Bhavani",
  assignerName: "Dilip Kumar",
  taskText: "Send the revised proposal",
  taskType: "email",
  dueDate: "2026-10-28T12:00:00.000Z",
  contactName: "Harish Reddy",
  link: "https://crm.example/#/contacts/5/show",
};

describe("formatDueDate", () => {
  it("shows the due date in Indian time", () => {
    expect(formatDueDate("2026-10-28T12:00:00.000Z")).toMatch(
      /28 Oct 2026, 5:30\s?pm/i,
    );
  });
});

describe("buildTaskEmail", () => {
  it("names the assigner, the task, the contact and the due date", () => {
    const email = buildTaskEmail(baseInput);

    expect(email.subject).toBe(
      "New task from Dilip Kumar: Send the revised proposal",
    );
    expect(email.text).toContain("Hi Bhavani,");
    expect(email.text).toContain("(re: Harish Reddy)");
    expect(email.text).toContain("email: Send the revised proposal");
    expect(email.text).toMatch(/Due: 28 Oct 2026/);
    expect(email.html).toContain(
      'href="https://crm.example/#/contacts/5/show"',
    );
  });

  it("leaves out the type when the task has none", () => {
    const email = buildTaskEmail({ ...baseInput, taskType: "none" });

    expect(email.text).toContain("\nSend the revised proposal\n");
  });

  it("escapes task text in the HTML so it cannot inject markup", () => {
    const email = buildTaskEmail({
      ...baseInput,
      taskText: '<img src=x onerror="alert(1)">',
    });

    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain(
      "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
    );
  });

  it("keeps the subject on one line", () => {
    const email = buildTaskEmail({
      ...baseInput,
      taskText: "Call\r\nBcc: someone@example.com",
    });

    expect(email.subject).toBe(
      "New task from Dilip Kumar: Call Bcc: someone@example.com",
    );
  });

  it("keeps the subject short for very long tasks", () => {
    const email = buildTaskEmail({ ...baseInput, taskText: "x".repeat(500) });

    expect(email.subject.length).toBeLessThanOrEqual(150);
  });
});
