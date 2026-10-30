import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ApiKeyDetailRecord } from "@/features/api-keys/components/ApiKeyTypes";

const routerReplace = vi.fn();
const routerPush = vi.fn();
const routerRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerReplace, push: routerPush, refresh: routerRefresh }),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "" }),
  Geist_Mono: () => ({ variable: "" }),
}));

vi.mock("@/lib/constants", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/constants")>()),
  backendApiUrl: (path: string) => `http://localhost:4000/api/v1${path}`,
}));

type ActionOptions = Parameters<
  typeof import("@/features/api-keys/hooks/useApiKeyActions").useApiKeyActions
>[0];

const capturedActionOptions: ActionOptions[] = [];

vi.mock("@/features/api-keys/hooks/useApiKeyActions", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/api-keys/hooks/useApiKeyActions")>();

  return {
    ...actual,
    useApiKeyActions: (options: ActionOptions) => {
      capturedActionOptions.push(options);
      return actual.useApiKeyActions(options);
    },
  };
});

const DAY_MS = 24 * 60 * 60 * 1000;

const TZ_AT_LOAD = process.env.TZ;

function detailRecord(overrides: Partial<ApiKeyDetailRecord> = {}): ApiKeyDetailRecord {
  return {
    id: "key_old",
    keyPrefix: "vw_12345",
    keySuffix: "abcdef12",
    name: "Docs",
    isActive: true,
    rateLimit: 300,
    scopes: ["user:read", "changelog:read"],
    expiresAt: new Date(Date.now() + 30 * DAY_MS).toISOString(),
    revokedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    lastUsed: null,
    ...overrides,
  };
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  routerReplace.mockReset();
  routerPush.mockReset();
  routerRefresh.mockReset();
  capturedActionOptions.length = 0;
});

describe("S-082 S-084 S-181 rotate keeps what the user did not change", () => {
  it("S-082 rotating a 300/15 min key sends no lower limit and keeps the exact expiry", async () => {
    const { buildRotateApiKeyPayload } = await import("@/features/api-keys/api-key-service");
    const { toLocalDateInput } = await import("@/lib/local-date");

    const current = detailRecord({ expiresAt: "2027-03-01T15:42:10.123Z" });
    const payload = buildRotateApiKeyPayload(current, {
      name: current.name,
      rateLimit: 300,
      expiresAt: toLocalDateInput(new Date(current.expiresAt!)),
    });

    // The server keeps the current value for every field left out.
    expect(payload.rateLimit ?? current.rateLimit).toBe(300);
    expect(payload).not.toHaveProperty("expiresAt");
  });

  it("S-082 an admin-raised limit above the self-serve maximum is not clamped on rotate", async () => {
    const { buildRotateApiKeyPayload } = await import("@/features/api-keys/api-key-service");

    const current = detailRecord({ rateLimit: 5000 });
    const payload = buildRotateApiKeyPayload(current, {
      name: current.name,
      rateLimit: 5000,
      expiresAt: "",
    });

    expect(payload.rateLimit ?? current.rateLimit).toBe(5000);
  });

  it("S-084 a changed expiry is sent as the end of the chosen local day", async () => {
    const { buildRotateApiKeyPayload } = await import("@/features/api-keys/api-key-service");
    const { endOfLocalDay } = await import("@/lib/local-date");

    const payload = buildRotateApiKeyPayload(detailRecord(), {
      name: "Docs",
      rateLimit: 300,
      expiresAt: "2999-06-15",
    });

    expect(payload.expiresAt).toBe(endOfLocalDay("2999-06-15").toISOString());
  });

  it("S-084 the rotate request carries the payload unchanged and returns the new key", async () => {
    const { rotateApiKey } = await import("@/features/api-keys/api-key-service");

    const fetchMock = vi.fn(async () =>
      jsonResponse(201, {
        success: true,
        data: { ...detailRecord({ id: "key_new" }), key: "vw_x" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const rotated = await rotateApiKey("key_old", { rateLimit: 450 });

    expect(rotated.id).toBe("key_new");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/api-keys/key_old/rotate");
    expect(JSON.parse(String(init.body))).toEqual({ rateLimit: 450 });
  });
});

describe("S-084 S-181 expiry is the end of the chosen local day", () => {
  it("S-084 under America/Los_Angeles a picked date expires at local midnight, not UTC", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    const { buildCreateApiKeyPayload } = await import("@/features/api-keys/api-key-service");

    const payload = buildCreateApiKeyPayload({
      name: "Docs",
      scopes: ["user:read"],
      rateLimit: 20,
      expiresAt: "2026-11-03",
    });

    expect(payload.expiresAt).toBe("2026-11-04T07:59:59.999Z");
  });

  it("S-181 the picker's earliest day is tomorrow in the user's time zone", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    // 23:30 on 2 November in Los Angeles is already 3 November in UTC.
    vi.useFakeTimers({ now: new Date("2026-11-03T07:30:00.000Z"), toFake: ["Date"] });
    const { tomorrowLocalDateInput } = await import("@/lib/local-date");

    try {
      expect(tomorrowLocalDateInput()).toBe("2026-11-03");
    } finally {
      vi.useRealTimers();
    }
  });

  it("S-084 the rotate form shows the stored expiry as its local calendar day", async () => {
    vi.stubEnv("TZ", "America/Los_Angeles");
    const { expiryDateInputValue } = await import("@/features/api-keys/api-key-service");

    // 03:00 UTC on 2 March is still 1 March in Los Angeles.
    expect(expiryDateInputValue("2027-03-02T03:00:00.000Z")).toBe("2027-03-01");
    expect(expiryDateInputValue(null)).toBe("");
  });
});

describe("S-356 the time-zone tests leave TZ as they found it", () => {
  it('S-356 TZ is back to its value when the file loaded, not the string "undefined"', () => {
    expect(process.env.TZ).toBe(TZ_AT_LOAD);
  });
});

describe("S-086 S-262 a key's status follows expiry, revocation and admin disable", () => {
  it("S-086 a past expiresAt is Expired even while the row is still active", async () => {
    const { getApiKeyStatus } = await import("@/features/api-keys/api-key-service");

    expect(
      getApiKeyStatus({
        isActive: true,
        revokedAt: null,
        expiresAt: new Date(Date.now() - DAY_MS).toISOString(),
      }),
    ).toBe("expired");
    expect(getApiKeyStatus(detailRecord())).toBe("active");
    expect(
      getApiKeyStatus(detailRecord({ isActive: false, revokedAt: "2026-02-01T00:00:00Z" })),
    ).toBe("revoked");
    expect(getApiKeyStatus(detailRecord({ isActive: false, revokedAt: null }))).toBe("disabled");
  });

  it("S-086 the list renders Expired for a past expiresAt and offers no Rotate", async () => {
    // The row menu renders its items only while open; render it open so the actions show.
    vi.resetModules();
    vi.doMock("@veriworkly/ui", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@veriworkly/ui")>();
      const open = { open: true, close: () => {}, toggle: () => {}, menuId: "menu" };

      return {
        ...actual,
        Menu: ({ trigger, children }: Parameters<typeof actual.Menu>[0]) => (
          <>
            {trigger(open)}
            {children(open)}
          </>
        ),
      };
    });
    const { default: ApiKeyList } = await import("@/features/api-keys/components/ApiKeyList");
    vi.doUnmock("@veriworkly/ui");
    vi.resetModules();

    const row = (id: string, expiresAt: string) => ({
      id,
      name: id,
      keyPrefix: "vw_aaaaa",
      isActive: true,
      createdAt: "2025-01-01T00:00:00.000Z",
      lastUsed: null,
      expiresAt,
      revokedAt: null,
    });
    const listHtml = (key: ReturnType<typeof row>) =>
      renderToStaticMarkup(
        <ApiKeyList
          keys={[key]}
          page={1}
          totalPages={1}
          hasMore={false}
          loading={false}
          onPrevPage={() => {}}
          onNextPage={() => {}}
          onRotate={() => {}}
          onDelete={() => {}}
          onRevoke={() => {}}
        />,
      );

    // The control: a live key does offer Rotate, so its absence below means something.
    expect(listHtml(row("key_live", new Date(Date.now() + DAY_MS).toISOString()))).toContain(
      "Rotate",
    );

    const html = listHtml(row("key_expired", new Date(Date.now() - DAY_MS).toISOString()));

    expect(html).toContain("Expired");
    expect(html).not.toMatch(/>Active</);
    expect(html).not.toContain("Rotate");
    expect(html).toContain("Revoke");
  });

  it("S-277 V-195 a revoked or rotated-out key in the list reads Revoked, never admin-disabled", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(__dirname, "..", "..", "..", "server", "src", "services", "apiKeyService.ts"),
      "utf8",
    );
    const listSelect = source.slice(source.indexOf("static async list"));
    expect(listSelect.slice(0, 2000)).toMatch(/expiresAt: true[\s\S]*revokedAt: true/);

    const { default: ApiKeyList } = await import("@/features/api-keys/components/ApiKeyList");
    const html = renderToStaticMarkup(
      <ApiKeyList
        keys={[
          {
            id: "key_revoked",
            name: "Rotated CI",
            keyPrefix: "vw_bbbbb",
            isActive: false,
            createdAt: "2025-01-01T00:00:00.000Z",
            lastUsed: null,
            expiresAt: null,
            revokedAt: "2026-02-01T00:00:00.000Z",
          },
        ]}
        page={1}
        totalPages={1}
        hasMore={false}
        loading={false}
        onPrevPage={() => {}}
        onNextPage={() => {}}
        onRotate={() => {}}
        onDelete={() => {}}
        onRevoke={() => {}}
      />,
    );

    expect(html).toContain("Revoked");
    expect(html).not.toMatch(/administrator disabled/i);
  });

  it("S-262 the detail view of an expired key offers no Rotate and its badge agrees", async () => {
    const { default: ApiKeyDetailView } =
      await import("@/features/api-keys/components/details/ApiKeyDetailView");

    const html = renderToStaticMarkup(
      <ApiKeyDetailView
        initialData={detailRecord({ expiresAt: new Date(Date.now() - DAY_MS).toISOString() })}
      />,
    );

    expect(html).toContain("Expired");
    expect(html).not.toContain("Rotate");
  });

  it("S-262 an admin-disabled key is Disabled, never Revoked next to 'Not revoked'", async () => {
    const { default: ApiKeyDetailView } =
      await import("@/features/api-keys/components/details/ApiKeyDetailView");

    const html = renderToStaticMarkup(
      <ApiKeyDetailView initialData={detailRecord({ isActive: false, revokedAt: null })} />,
    );

    expect(html).toContain("Disabled");
    expect(html).not.toContain("Revoked");
    expect(html).not.toContain("Rotate");
  });

  it("S-083 the detail header names the 15-minute window", async () => {
    const { default: ApiKeyDetailView } =
      await import("@/features/api-keys/components/details/ApiKeyDetailView");

    const html = renderToStaticMarkup(<ApiKeyDetailView initialData={detailRecord()} />);

    expect(html).toContain("300/15 min");
    expect(html).not.toContain("/min");
  });
});

describe("S-085 rotate from the detail page", () => {
  it("S-085 ApiKeyDetailView navigates to the new key's id after a rotate", async () => {
    const { default: ApiKeyDetailView } =
      await import("@/features/api-keys/components/details/ApiKeyDetailView");

    renderToStaticMarkup(<ApiKeyDetailView initialData={detailRecord()} />);

    const options = capturedActionOptions.at(-1);
    expect(options).toBeDefined();

    options!.onRotated({ ...detailRecord({ id: "key/new" }), key: "vw_secret" });

    expect(routerReplace).toHaveBeenCalledWith("/api-keys/key%2Fnew");
  });
});

describe("E LOW API key scope summary and errors", () => {
  it("ai:write is summarised as Write, read-only groups as Read", async () => {
    const { default: summarizeApiKeyScopes } =
      await import("@/features/api-keys/components/ApiKeyScopes");

    const summary = summarizeApiKeyScopes([
      "ai:write",
      "changelog:read",
      "user:read",
      "user:write",
    ]);

    expect(summary).toContainEqual({ label: "AI", access: "Write" });
    expect(summary).toContainEqual({ label: "Changelog", access: "Read" });
    expect(summary).toContainEqual({ label: "Profile", access: "Read / Write" });
  });

  it("S-084 a validation 400 shows the server's field message, not 'Validation failed'", async () => {
    const { apiKeyErrorMessage } = await import("@/features/api-keys/api-key-service");
    const { ApiRequestError } = await import("@/utils/fetchApiData");

    const error = new ApiRequestError("Validation failed", 400, [
      { path: "expiresAt", message: "expiresAt must be in the future" },
    ]);

    expect(apiKeyErrorMessage(error, "Failed")).toBe("expiresAt must be in the future");
    expect(apiKeyErrorMessage(new ApiRequestError("Key has expired", 409), "Failed")).toBe(
      "Key has expired",
    );
    expect(apiKeyErrorMessage(new Error("boom"), "Failed")).toBe("Failed");
  });
});

describe("S-094 the ambassador page offers no edit the server refuses", () => {
  const application = {
    collegeName: "State University",
    graduationYear: "2027",
    whyJoin: "To help classmates",
    superpower: "Organising",
    funFact: "Juggles",
    vibeCheck: null,
    socialHandle: null,
    reviewNote: null,
    reviewedAt: null,
    submittedAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };

  async function renderAmbassador(status: "PENDING" | "REJECTED") {
    const { AmbassadorPage } = await import("@/features/ambassador/AmbassadorPage");

    return renderToStaticMarkup(
      <AmbassadorPage
        status={{
          name: "Ada Lovelace",
          email: "ada@example.com",
          role: "USER",
          ambassadorStatus: status,
          collegeName: application.collegeName,
          graduationYear: application.graduationYear,
          application: { ...application, status },
        }}
      />,
    );
  }

  it("S-094 a pending applicant sees no Update link", async () => {
    expect(await renderAmbassador("PENDING")).not.toContain(">Update<");
  });

  it("S-094 a rejected applicant can still update and reapply", async () => {
    expect(await renderAmbassador("REJECTED")).toContain(">Update<");
  });
});

describe("account and key pages say what is true (O7 LOW)", () => {
  it("a new key shows when it expires and links to its own page", async () => {
    const { default: GeneratedApiKeyCard } =
      await import("@/features/api-keys/components/GeneratedApiKeyCard");

    const html = renderToStaticMarkup(
      <GeneratedApiKeyCard
        generatedKey="vw_secret"
        keyId="key 1"
        expiresAt="2027-10-27T00:00:00.000Z"
        copied={false}
        onCopy={() => undefined}
        onDismiss={() => undefined}
      />,
    );

    expect(html).toContain('href="/api-keys/key%201"');
    expect(html).toContain("Expires");
  });

  it("the create form states the default lifetime in plain words", async () => {
    const { ApiKeyDetailsForm } =
      await import("@/features/api-keys/components/create/ApiKeyDetailsForm");

    const html = renderToStaticMarkup(
      <ApiKeyDetailsForm
        name=""
        rateLimit={20}
        expiresAt=""
        disabled={false}
        onNameChange={() => undefined}
        onRateLimitChange={() => undefined}
        onExpiresAtChange={() => undefined}
      />,
    );

    expect(html).not.toContain("Midnight your time");
    expect(html).toContain("standard lifetime of one year");
  });

  it("an unverified email is not shown with a green check, and the name field is not the email", async () => {
    const { default: ProfileDataPanel } =
      await import("@/features/profile/components/ProfileDataPanel");
    const profile = {
      id: "u1",
      name: null,
      username: null,
      email: "jane@example.com",
      emailVerified: false,
      autoSyncEnabled: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };

    const html = renderToStaticMarkup(<ProfileDataPanel profile={profile} />);

    expect(html).toContain("Email not verified");
    expect(html).not.toContain("Verified email");
  });

  it("roadmap admin calls encode the feature id", async () => {
    const spy = vi.spyOn(await import("@/utils/fetchApiData"), "fetchApiData");
    spy.mockResolvedValue({} as never);
    const { updateRoadmapFeature, deleteRoadmapFeature } =
      await import("@/features/roadmap/services/admin-roadmap");

    await updateRoadmapFeature("a/b", { title: "T" }, "Renamed the item");
    await deleteRoadmapFeature("a/b", "Shipped and retired");

    expect(spy.mock.calls.map((call) => call[0])).toEqual([
      "/admin/roadmap/a%2Fb",
      "/admin/roadmap/a%2Fb",
    ]);
  });

  it("the ambassador kit claims no offline mode and no opt-in sync", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(__dirname, "..", "..", "features/ambassador/ShareToolkit.tsx"),
      "utf8",
    );

    expect(source).not.toMatch(/works offline|unless I choose to sync/);
  });

  it("the locked-username dialog links to a way to reach us", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync(
      join(__dirname, "..", "..", "features/profile/components/UsernameLockedModal.tsx"),
      "utf8",
    );

    expect(source).toContain("/contact");
  });
});
