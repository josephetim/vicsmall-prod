import type { ReservationRecord, SlotStatus, Stand } from "@/modules/tradefair/types/tradefair.types";
import type { RegistrationStatus } from "@/modules/tradefair/types/backend.types";

export function getUnitStatus(
  unit: Stand,
  reservations: ReservationRecord[],
): SlotStatus {
  if (unit.type === "shared") {
    const paidCount = reservations.filter(
      (reservation) => reservation.unitId === unit.id && reservation.status === "paid",
    ).length;
    const heldCount = reservations.filter(
      (reservation) => reservation.unitId === unit.id && reservation.status === "held",
    ).length;

    if (paidCount >= unit.capacity) return "paid";
    if (paidCount + heldCount > 0) return "held";
    return "available";
  }

  if (
    reservations.some(
      (reservation) => reservation.unitId === unit.id && reservation.status === "paid",
    )
  ) {
    return "paid";
  }

  if (
    reservations.some(
      (reservation) => reservation.unitId === unit.id && reservation.status === "held",
    )
  ) {
    return "held";
  }

  return "available";
}

export function getSlotStatus(
  unitId: string,
  slotId: string,
  reservations: ReservationRecord[],
): SlotStatus {
  if (
    reservations.some(
      (reservation) =>
        reservation.unitId === unitId &&
        reservation.slotId === slotId &&
        reservation.status === "paid",
    )
  ) {
    return "paid";
  }

  if (
    reservations.some(
      (reservation) =>
        reservation.unitId === unitId &&
        reservation.slotId === slotId &&
        reservation.status === "held",
    )
  ) {
    return "held";
  }

  return "available";
}

export function isActiveRegistrationStatus(status: RegistrationStatus): boolean {
  return ["held", "pending_payment", "paid"].includes(status);
}
