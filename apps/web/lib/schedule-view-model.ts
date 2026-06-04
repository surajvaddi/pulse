import type { DemoShift } from "@/lib/api";

export type ScheduleShiftView = DemoShift & {
  startsLabel: string;
  endsLabel: string;
  durationHours: number;
  statusTone: "assigned" | "open" | "pending" | "neutral";
};

export type ScheduleDayGroup = {
  dateKey: string;
  label: string;
  shifts: ScheduleShiftView[];
};

export type ScheduleViewModel = {
  groups: ScheduleDayGroup[];
  selectedShift: ScheduleShiftView | null;
  summary: {
    assignedCount: number;
    openCount: number;
    pendingCount: number;
    totalHours: number;
  };
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function formatScheduleTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function statusTone(status: string): ScheduleShiftView["statusTone"] {
  const normalized = status.toUpperCase();
  if (normalized.includes("ASSIGNED") || normalized.includes("PUBLISHED")) {
    return "assigned";
  }
  if (normalized.includes("OPEN")) {
    return "open";
  }
  if (normalized.includes("PENDING") || normalized.includes("SWAP")) {
    return "pending";
  }
  return "neutral";
}

function toShiftView(shift: DemoShift): ScheduleShiftView {
  const startsAt = new Date(shift.startsAt);
  const endsAt = new Date(shift.endsAt);
  return {
    ...shift,
    startsLabel: formatScheduleTime(shift.startsAt),
    endsLabel: formatScheduleTime(shift.endsAt),
    durationHours: Math.max(0, (endsAt.getTime() - startsAt.getTime()) / 3_600_000),
    statusTone: statusTone(shift.status)
  };
}

export function buildScheduleViewModel(shifts: DemoShift[]): ScheduleViewModel {
  const sorted = [...shifts].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime()
  );
  const shiftViews = sorted.map(toShiftView);
  const groupMap = new Map<string, ScheduleDayGroup>();

  for (const shift of shiftViews) {
    const dateKey = shift.startsAt.slice(0, 10);
    const group = groupMap.get(dateKey) ?? {
      dateKey,
      label: formatDate(shift.startsAt),
      shifts: []
    };
    group.shifts.push(shift);
    groupMap.set(dateKey, group);
  }

  return {
    groups: [...groupMap.values()],
    selectedShift: shiftViews.at(0) ?? null,
    summary: {
      assignedCount: shiftViews.filter((shift) => shift.statusTone === "assigned").length,
      openCount: shiftViews.filter((shift) => shift.statusTone === "open").length,
      pendingCount: shiftViews.filter((shift) => shift.statusTone === "pending").length,
      totalHours: shiftViews.reduce((total, shift) => total + shift.durationHours, 0)
    }
  };
}
