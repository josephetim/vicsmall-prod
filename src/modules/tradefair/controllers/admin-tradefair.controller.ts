import type { Request, Response } from "express";

import { sendSuccess } from "@/backend/utils/response";
import { auditLogRepository } from "@/modules/tradefair/repositories/audit-log.repository";
import { tradefairAdminService } from "@/modules/tradefair/services/tradefair-admin.service";
import { tradefairExportService } from "@/modules/tradefair/services/tradefair-export.service";
import { tradefairLayoutAdminService } from "@/modules/tradefair/services/tradefair-layout-admin.service";
import { tradefairTermsService } from "@/modules/tradefair/services/tradefair-terms.service";

function extractActorId(req: Request) {
  return req.adminContext?.userId ?? "admin-user";
}

function getParam(req: Request, key: string) {
  const value = req.params[key];
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function getQueryString(req: Request, key: string) {
  const value = req.query[key];
  if (Array.isArray(value)) return String(value[0] ?? "");
  if (value === undefined) return undefined;
  return String(value);
}

export const adminTradefairController = {
  async getDashboard(req: Request, res: Response) {
    const data = await tradefairAdminService.getDashboard(getParam(req, "eventId"));
    return sendSuccess(res, data);
  },

  async getRegistrations(req: Request, res: Response) {
    const data = await tradefairAdminService.listRegistrations(getParam(req, "eventId"), {
      page: getQueryString(req, "page") ? Number(getQueryString(req, "page")) : undefined,
      limit: getQueryString(req, "limit") ? Number(getQueryString(req, "limit")) : undefined,
      vendorName: getQueryString(req, "vendorName"),
      brandName: getQueryString(req, "brandName"),
      phone: getQueryString(req, "phone"),
      standType: getQueryString(req, "standType") as
        | "premium"
        | "single"
        | "shared"
        | undefined,
      standCode: getQueryString(req, "standCode"),
      paymentStatus: getQueryString(req, "paymentStatus") as
        | "initialized"
        | "pending"
        | "success"
        | "failed"
        | "abandoned"
        | "refunded"
        | undefined,
      registrationStatus: getQueryString(req, "registrationStatus") as
        | "draft"
        | "held"
        | "pending_payment"
        | "paid"
        | "failed"
        | "expired"
        | "cancelled"
        | "refunded"
        | undefined,
      fromDate: getQueryString(req, "fromDate"),
      toDate: getQueryString(req, "toDate"),
      category: getQueryString(req, "category"),
      bookingReference: getQueryString(req, "bookingReference"),
    });

    return sendSuccess(res, data.items, 200, data.meta);
  },

  async getRegistrationDetail(req: Request, res: Response) {
    const data = await tradefairAdminService.getRegistrationDetail(
      getParam(req, "registrationId"),
    );
    return sendSuccess(res, data);
  },

  async updateRegistration(req: Request, res: Response) {
    const data = await tradefairAdminService.updateRegistration(
      getParam(req, "registrationId"),
      req.body,
      extractActorId(req),
    );
    return sendSuccess(res, data);
  },

  async getPayments(req: Request, res: Response) {
    const data = await tradefairAdminService.listPayments(getParam(req, "eventId"), {
      page: getQueryString(req, "page") ? Number(getQueryString(req, "page")) : undefined,
      limit: getQueryString(req, "limit") ? Number(getQueryString(req, "limit")) : undefined,
      status: getQueryString(req, "status") as
        | "initialized"
        | "pending"
        | "success"
        | "failed"
        | "abandoned"
        | "refunded"
        | undefined,
      fromDate: getQueryString(req, "fromDate"),
      toDate: getQueryString(req, "toDate"),
      vendor: getQueryString(req, "vendor"),
      reference: getQueryString(req, "reference"),
      channel: getQueryString(req, "channel"),
    });

    return sendSuccess(res, data.items, 200, data.meta);
  },

  async getStands(req: Request, res: Response) {
    const data = await tradefairAdminService.listStands(getParam(req, "eventId"));
    return sendSuccess(res, data);
  },

  async updateStand(req: Request, res: Response) {
    const data = await tradefairAdminService.updateStand(
      getParam(req, "standId"),
      req.body,
      extractActorId(req),
    );
    return sendSuccess(res, data);
  },

  async updateSlot(req: Request, res: Response) {
    const data = await tradefairAdminService.updateSlot(
      getParam(req, "slotId"),
      req.body,
      extractActorId(req),
    );
    return sendSuccess(res, data);
  },

  async exportRegistrations(req: Request, res: Response) {
    const data = await tradefairExportService.exportRegistrations(
      getParam(req, "eventId"),
      req.query.format,
    );
    if (data.format === "csv") {
      res.setHeader("content-type", "text/csv; charset=utf-8");
      res.setHeader(
        "content-disposition",
        `attachment; filename="${data.filename}"`,
      );
      return res.status(200).send(data.data);
    }
    return sendSuccess(res, data.data);
  },

  async exportPayments(req: Request, res: Response) {
    const data = await tradefairExportService.exportPayments(
      getParam(req, "eventId"),
      req.query.format,
    );
    if (data.format === "csv") {
      res.setHeader("content-type", "text/csv; charset=utf-8");
      res.setHeader(
        "content-disposition",
        `attachment; filename="${data.filename}"`,
      );
      return res.status(200).send(data.data);
    }
    return sendSuccess(res, data.data);
  },

  async exportStands(req: Request, res: Response) {
    const data = await tradefairExportService.exportStands(
      getParam(req, "eventId"),
      req.query.format,
    );
    if (data.format === "csv") {
      res.setHeader("content-type", "text/csv; charset=utf-8");
      res.setHeader(
        "content-disposition",
        `attachment; filename="${data.filename}"`,
      );
      return res.status(200).send(data.data);
    }
    return sendSuccess(res, data.data);
  },

  async listCategories(req: Request, res: Response) {
    const data = await tradefairAdminService.listCategories(getParam(req, "eventId"));
    return sendSuccess(res, data);
  },

  async updateCategory(req: Request, res: Response) {
    const data = await tradefairAdminService.updateCategory(
      getParam(req, "eventId"),
      getParam(req, "categoryId"),
      req.body,
      extractActorId(req),
    );
    return sendSuccess(res, data);
  },

  async listTerms(req: Request, res: Response) {
    const data = await tradefairTermsService.listByEvent(getParam(req, "eventId"));
    return sendSuccess(res, data);
  },

  async createTerms(req: Request, res: Response) {
    const actorId = extractActorId(req);
    const data = await tradefairTermsService.create(
      getParam(req, "eventId"),
      req.body,
      actorId,
    );
    await auditLogRepository.create({
      eventId: getParam(req, "eventId"),
      actorType: "admin",
      actorId,
      action: "terms_changed",
      entityType: "terms",
      entityId: data._id,
      metadata: { action: "create", status: data.status },
    });
    return sendSuccess(res, data, 201);
  },

  async updateTerms(req: Request, res: Response) {
    const actorId = extractActorId(req);
    const data = await tradefairTermsService.update(getParam(req, "termsId"), req.body);
    if (data) {
      await auditLogRepository.create({
        eventId: String(data.eventId),
        actorType: "admin",
        actorId,
        action: "terms_changed",
        entityType: "terms",
        entityId: data._id,
        metadata: { action: "update", status: data.status },
      });
    }
    return sendSuccess(res, data);
  },

  async listLayouts(req: Request, res: Response) {
    const data = await tradefairLayoutAdminService.listLayouts(getParam(req, "eventId"));
    return sendSuccess(res, data);
  },

  async createLayout(req: Request, res: Response) {
    const data = await tradefairLayoutAdminService.createLayout(
      getParam(req, "eventId"),
      req.body,
    );
    return sendSuccess(res, data, 201);
  },

  async updateLayout(req: Request, res: Response) {
    const data = await tradefairLayoutAdminService.updateLayout(
      getParam(req, "layoutId"),
      req.body,
    );
    return sendSuccess(res, data);
  },

  async publishLayout(req: Request, res: Response) {
    const actorId = extractActorId(req);
    const data = await tradefairLayoutAdminService.publishLayout(
      getParam(req, "layoutId"),
      req.body,
    );
    if (data) {
      await auditLogRepository.create({
        eventId: String(data.eventId),
        actorType: "admin",
        actorId,
        action: "layout_published",
        entityType: "layout",
        entityId: data.layoutId,
        metadata: { versionId: data._id, version: data.version },
      });
    }
    return sendSuccess(res, data);
  },

  async duplicateEvent(req: Request, res: Response) {
    const data = await tradefairLayoutAdminService.duplicateEvent(
      getParam(req, "eventId"),
      req.body,
    );
    return sendSuccess(res, data, 201);
  },
};
