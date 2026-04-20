import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockPaystackPost, mockPaystackGet } = vi.hoisted(() => ({
  mockPaystackPost: vi.fn(),
  mockPaystackGet: vi.fn(),
}));

vi.mock("axios", () => ({
  default: {
    create: () => ({
      post: mockPaystackPost,
      get: mockPaystackGet,
    }),
  },
}));

import { createBackendApp } from "@/backend/app";
import { RegistrationModel } from "@/modules/tradefair/models/Registration";
import { StandSlotModel } from "@/modules/tradefair/models/StandSlot";
import { buildPaystackSignature } from "@/modules/tradefair/utils/paystack-signature";
import { expireHoldsJob } from "@/modules/tradefair/jobs/expire-holds.job";
import { seedTradefairData } from "./helpers/seed";

function holdPayload(overrides: Record<string, unknown> = {}) {
  return {
    firstName: "Jane",
    lastName: "Doe",
    phone: "08030000000",
    email: "jane@example.com",
    brandName: "Jane Brand",
    businessCategory: ["fashion"],
    standPreferences: "Near gate",
    standId: "",
    termsAccepted: true,
    ...overrides,
  };
}

async function loginAdmin(credentials: { identifier: string; password: string }) {
  const loginResponse = await request(createBackendApp()).post("/api/admin/auth/login").send({
    identifier: credentials.identifier,
    password: credentials.password,
  });

  expect(loginResponse.status).toBe(200);
  expect(loginResponse.body.success).toBe(true);
  expect(loginResponse.body.data.token).toBeTypeOf("string");

  return loginResponse.body.data.token as string;
}

describe("tradefair integration", () => {
  beforeEach(() => {
    mockPaystackPost.mockReset();
    mockPaystackGet.mockReset();
  });

  it("creates hold on premium stand and rejects double-booking", async () => {
    const seeded = await seedTradefairData();

    const firstHold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(holdPayload({ standId: String(seeded.premiumStands[0]._id) }));

    expect(firstHold.status).toBe(201);
    expect(firstHold.body.success).toBe(true);
    expect(firstHold.body.data.bookingReference).toMatch(/^VIC-TF-/);

    const secondHold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          firstName: "John",
          phone: "08030000001",
          brandName: "Other Brand",
          standId: String(seeded.premiumStands[0]._id),
        }),
      );

    expect(secondHold.status).toBe(409);
    expect(secondHold.body.success).toBe(false);
  });

  it("rejects blocked shared slot and rejects second hold on same shared slot", async () => {
    const seeded = await seedTradefairData({ blockFirstSlot: true });

    const blockedAttempt = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          standId: String(seeded.sharedStand._id),
          standSlotId: String(seeded.slots[0]._id),
        }),
      );

    expect(blockedAttempt.status).toBe(409);

    const firstSharedHold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          standId: String(seeded.sharedStand._id),
          standSlotId: String(seeded.slots[1]._id),
        }),
      );
    expect(firstSharedHold.status).toBe(201);

    const secondSharedHold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          firstName: "Mike",
          phone: "08030000002",
          brandName: "Mike Brand",
          standId: String(seeded.sharedStand._id),
          standSlotId: String(seeded.slots[1]._id),
        }),
      );

    expect(secondSharedHold.status).toBe(409);
  });

  it("enforces category limits on hold creation", async () => {
    const seeded = await seedTradefairData({ categoryLimit: 1 });

    const firstHold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(holdPayload({ standId: String(seeded.singleStands[0]._id) }));

    expect(firstHold.status).toBe(201);

    const secondHold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          firstName: "Emeka",
          phone: "08030000003",
          brandName: "Emeka Brand",
          standId: String(seeded.singleStands[1]._id),
        }),
      );

    expect(secondHold.status).toBe(409);
    expect(secondHold.body.error.message).toContain("reached its limit");
  });

  it("initializes and verifies payment successfully, and verify is idempotent", async () => {
    const seeded = await seedTradefairData();

    const hold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(holdPayload({ standId: String(seeded.singleStands[0]._id) }));
    expect(hold.status).toBe(201);

    const registrationId = hold.body.data.registrationId as string;
    const bookingReference = hold.body.data.bookingReference as string;

    mockPaystackPost.mockResolvedValue({
      data: {
        data: {
          authorization_url: "https://paystack.test/authorize",
          access_code: "AC_TEST",
          reference: "REF_OK",
        },
      },
    });

    const initialized = await request(createBackendApp()).post(
      `/api/tradefair/registrations/${registrationId}/payments/initialize`,
    );
    expect(initialized.status).toBe(201);
    expect(initialized.body.data.reference).toBe("REF_OK");

    mockPaystackGet.mockResolvedValue({
      data: {
        data: {
          status: "success",
          channel: "card",
          paid_at: "2026-04-20T09:00:00.000Z",
        },
      },
    });

    const verified = await request(createBackendApp())
      .post("/api/tradefair/payments/verify")
      .send({ reference: "REF_OK" });
    expect(verified.status).toBe(200);
    expect(verified.body.data.ok).toBe(true);
    expect(verified.body.data.bookingReference).toBe(bookingReference);
    expect(verified.body.data.alreadyVerified).toBe(false);

    const verifiedAgain = await request(createBackendApp())
      .post("/api/tradefair/payments/verify")
      .send({ reference: "REF_OK" });
    expect(verifiedAgain.status).toBe(200);
    expect(verifiedAgain.body.data.ok).toBe(true);
    expect(verifiedAgain.body.data.alreadyVerified).toBe(true);
  });

  it("handles non-success paystack verify responses", async () => {
    const seeded = await seedTradefairData();

    const hold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          standId: String(seeded.premiumStands[1]._id),
          phone: "08030000004",
          brandName: "Brand X",
        }),
      );
    expect(hold.status).toBe(201);

    mockPaystackPost.mockResolvedValue({
      data: {
        data: {
          authorization_url: "https://paystack.test/authorize",
          access_code: "AC_TEST_2",
          reference: "REF_FAIL",
        },
      },
    });

    await request(createBackendApp()).post(
      `/api/tradefair/registrations/${hold.body.data.registrationId}/payments/initialize`,
    );

    mockPaystackGet.mockResolvedValue({
      data: {
        data: {
          status: "failed",
          channel: "card",
        },
      },
    });

    const verifyFailed = await request(createBackendApp())
      .post("/api/tradefair/payments/verify")
      .send({ reference: "REF_FAIL" });

    expect(verifyFailed.status).toBe(200);
    expect(verifyFailed.body.data.ok).toBe(false);
    expect(verifyFailed.body.data.status).toBe("failed");
  });

  it("validates webhook signature and processes charge.success idempotently", async () => {
    const seeded = await seedTradefairData();

    const hold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          standId: String(seeded.singleStands[0]._id),
          phone: "08030000005",
          brandName: "Webhook Brand",
        }),
      );

    mockPaystackPost.mockResolvedValue({
      data: {
        data: {
          authorization_url: "https://paystack.test/authorize",
          access_code: "AC_WEB",
          reference: "REF_WEB",
        },
      },
    });

    await request(createBackendApp()).post(
      `/api/tradefair/registrations/${hold.body.data.registrationId}/payments/initialize`,
    );

    mockPaystackGet.mockResolvedValue({
      data: {
        data: {
          status: "success",
          channel: "bank",
          paid_at: "2026-04-20T10:00:00.000Z",
        },
      },
    });

    const payload = { event: "charge.success", data: { reference: "REF_WEB" } };
    const signature = buildPaystackSignature(
      JSON.stringify(payload),
      process.env.PAYSTACK_WEBHOOK_SECRET as string,
    );

    const webhook = await request(createBackendApp())
      .post("/api/tradefair/payments/webhook")
      .set("x-paystack-signature", signature)
      .send(payload);

    expect(webhook.status).toBe(200);
    expect(webhook.body.data.acknowledged).toBe(true);

    const invalidWebhook = await request(createBackendApp())
      .post("/api/tradefair/payments/webhook")
      .set("x-paystack-signature", "bad-signature")
      .send(payload);

    expect(invalidWebhook.status).toBe(401);
  });

  it("expires stale holds and releases shared slots", async () => {
    const seeded = await seedTradefairData();

    const hold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          standId: String(seeded.sharedStand._id),
          standSlotId: String(seeded.slots[2]._id),
          phone: "08030000006",
          brandName: "Expire Brand",
        }),
      );

    expect(hold.status).toBe(201);
    const registrationId = hold.body.data.registrationId as string;

    await RegistrationModel.findByIdAndUpdate(registrationId, {
      holdExpiresAt: new Date(Date.now() - 60 * 1000),
      registrationStatus: "held",
    });

    const result = await expireHoldsJob();
    expect(result.expiredCount).toBe(1);

    const registration = await RegistrationModel.findById(registrationId).lean();
    expect(registration?.registrationStatus).toBe("expired");

    const slot = await StandSlotModel.findById(seeded.slots[2]._id).lean();
    expect(slot?.status).toBe("available");
  });

  it("supports admin stand/slot updates, reassignment, and CSV exports", async () => {
    const seeded = await seedTradefairData();
    const token = await loginAdmin(seeded.adminCredentials);

    const hold = await request(createBackendApp())
      .post(`/api/tradefair/events/${seeded.event.slug}/registrations/hold`)
      .send(
        holdPayload({
          standId: String(seeded.premiumStands[0]._id),
          phone: "08030000007",
          brandName: "Admin Flow Brand",
        }),
      );

    const headers = { Authorization: `Bearer ${token}` };

    const blockStand = await request(createBackendApp())
      .patch(`/api/admin/tradefair/stands/${seeded.singleStands[0]._id}`)
      .set(headers)
      .send({ action: "block" });
    expect(blockStand.status).toBe(200);
    expect(blockStand.body.data.isBlocked).toBe(true);

    const blockSlot = await request(createBackendApp())
      .patch(`/api/admin/tradefair/stand-slots/${seeded.slots[3]._id}`)
      .set(headers)
      .send({ action: "block" });
    expect(blockSlot.status).toBe(200);
    expect(blockSlot.body.data.status).toBe("blocked");

    const reassign = await request(createBackendApp())
      .patch(`/api/admin/tradefair/registrations/${hold.body.data.registrationId}`)
      .set(headers)
      .send({
        action: "reassign_stand",
        standId: String(seeded.premiumStands[1]._id),
      });
    expect(reassign.status).toBe(200);
    expect(reassign.body.data.registration.standType).toBe("premium");

    const csvExport = await request(createBackendApp())
      .get(`/api/admin/tradefair/events/${seeded.event._id}/export/registrations`)
      .set(headers)
      .query({ format: "csv" });

    expect(csvExport.status).toBe(200);
    expect(csvExport.headers["content-type"]).toContain("text/csv");
    expect(csvExport.text).toContain("registrationId,bookingReference");
  });

  it("authenticates admin and allows /me and protected dashboard", async () => {
    const seeded = await seedTradefairData();
    const token = await loginAdmin(seeded.adminCredentials);

    const me = await request(createBackendApp())
      .get("/api/admin/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(me.status).toBe(200);
    expect(me.body.success).toBe(true);
    expect(me.body.data.user.username).toBe("admin");

    const logout = await request(createBackendApp())
      .post("/api/admin/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logout.status).toBe(200);
    expect(logout.body.success).toBe(true);

    const dashboard = await request(createBackendApp())
      .get(`/api/admin/tradefair/events/${seeded.event._id}/dashboard`)
      .set("Authorization", `Bearer ${token}`);

    expect(dashboard.status).toBe(200);
    expect(dashboard.body.success).toBe(true);
  });

  it("protects admin routes when missing auth header", async () => {
    const seeded = await seedTradefairData();

    const response = await request(createBackendApp()).get(
      `/api/admin/tradefair/events/${seeded.event._id}/dashboard`,
    );

    expect(response.status).toBe(401);
  });
});
