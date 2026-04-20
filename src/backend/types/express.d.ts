import type { TradefairAdminRole } from "@/modules/tradefair/types/backend.types";

declare global {
  namespace Express {
    interface Request {
      adminContext?: {
        userId: string;
        role: TradefairAdminRole;
        email: string;
        username: string;
      };
      rawBody?: string;
    }
  }
}

export {};
