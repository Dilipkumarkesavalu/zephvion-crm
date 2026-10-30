import {
  buildPortalUrl,
  generatePortalToken,
  hashPortalToken,
} from "./portalLink";
import { shapeTickets } from "./shapePortal";

describe("portal links", () => {
  it("makes unguessable 64-character tokens", () => {
    const first = generatePortalToken();
    const second = generatePortalToken();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toBe(second);
  });

  it("stores the same SHA-256 fingerprint the server checks", async () => {
    expect(await hashPortalToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("opens the portal page of this app", () => {
    expect(
      buildPortalUrl("f".repeat(64), {
        origin: "https://dilipkumarkesavalu.github.io",
        pathname: "/zephvion-crm/app/",
      }),
    ).toBe(
      `https://dilipkumarkesavalu.github.io/zephvion-crm/app/#/portal/${"f".repeat(64)}`,
    );
  });
});

describe("demo portal shaping", () => {
  it("drops internal notes like the live portal", () => {
    const [ticket] = shapeTickets(
      [
        {
          id: 1,
          number: "TKT-0001",
          subject: "x",
          status: "open",
          priority: "low",
          created_at: "2026-10-30",
        },
      ],
      [
        {
          id: 1,
          ticket_id: 1,
          body: "note",
          is_internal: true,
          created_at: "2026-10-30",
        },
        {
          id: 2,
          ticket_id: 1,
          body: "reply",
          is_internal: false,
          created_at: "2026-10-30",
        },
      ],
      new Map(),
    );

    expect(ticket.comments.map((comment) => comment.body)).toEqual(["reply"]);
  });
});
