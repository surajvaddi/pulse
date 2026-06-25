"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarPlus, MessageSquare, RefreshCw, Send } from "lucide-react";

import type { ScheduleViewModel, ScheduleShiftView } from "@/lib/schedule-view-model";
import { EmployeeEmptyState } from "../employee-empty-state";

function formatShiftTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function unitLabel(unitId: string) {
  return unitId.replace(/^unit_/, "").replaceAll("_", " ").toUpperCase();
}

function shiftButtonLabel(shift: ScheduleShiftView) {
  return `${shift.title}, ${formatShiftTime(shift.startsAt)}`;
}

export function ScheduleWorkspace({ schedule }: { schedule: ScheduleViewModel }) {
  const initialShiftId = schedule.selectedShift?.id ?? null;
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(initialShiftId);
  const shifts = useMemo(() => schedule.groups.flatMap((group) => group.shifts), [schedule.groups]);
  const selectedShift = shifts.find((shift) => shift.id === selectedShiftId) ?? schedule.selectedShift;

  return (
    <>
      <div className="schedule-layout">
        <section className="panel schedule-board">
          <div className="section-heading">
            <h2>Schedule</h2>
            <span>
              {schedule.groups.length} days · {schedule.summary.openCount} open
            </span>
          </div>
          <div className="schedule-view-tabs" aria-label="Schedule view modes">
            <span className="schedule-view-tab is-active">List view</span>
            <span className="schedule-view-tab">Calendar below</span>
          </div>
          <div className="schedule-legend" aria-label="Schedule status legend">
            <span className="status-pill status-assigned">Assigned</span>
            <span className="status-pill status-open">Open</span>
            <span className="status-pill status-pending">Pending</span>
          </div>
          <section className="schedule-view-section" aria-labelledby="schedule-list-heading">
            <div className="schedule-view-heading">
              <h3 id="schedule-list-heading">List view</h3>
              <span>Select a row to update the shift card</span>
            </div>
            <div className="schedule-days">
              {schedule.groups.map((group) => (
                <article className="schedule-day" key={group.dateKey}>
                  <h4>{group.label}</h4>
                  {group.shifts.map((shift) => {
                    const isSelected = selectedShift?.id === shift.id;
                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`schedule-shift schedule-shift-${shift.statusTone}${isSelected ? " is-selected" : ""}`}
                        key={shift.id}
                        onClick={() => setSelectedShiftId(shift.id)}
                        type="button"
                      >
                        <div>
                          <strong>{shift.title}</strong>
                          <span>
                            {shift.startsLabel} to {shift.endsLabel}
                          </span>
                        </div>
                        <span className={`status-pill status-${shift.statusTone}`}>{shift.status}</span>
                      </button>
                    );
                  })}
                </article>
              ))}
            </div>
          </section>
        </section>

        <aside className="panel selected-shift-panel">
          <div className="selected-shift-header">
            <div>
              <p className="eyebrow">Selected</p>
              <h2>Selected shift</h2>
            </div>
            <span className="selected-shift-badge">{selectedShift ? "Ready for action" : "No shift selected"}</span>
          </div>
          {selectedShift ? (
            <div className="selected-shift-stack">
              <div className="selected-shift-title">
                <strong>{selectedShift.title}</strong>
                <span className={`status-pill status-${selectedShift.statusTone}`}>{selectedShift.status}</span>
              </div>
              <p className="selected-shift-note">
                This card updates when you select a shift from the list or calendar.
              </p>
              <div className="selected-shift-facts">
                <div>
                  <span>Starts</span>
                  <strong>{formatShiftTime(selectedShift.startsAt)}</strong>
                </div>
                <div>
                  <span>Ends</span>
                  <strong>{formatShiftTime(selectedShift.endsAt)}</strong>
                </div>
                <div>
                  <span>Unit</span>
                  <strong>{unitLabel(selectedShift.unitId)}</strong>
                </div>
                <div>
                  <span>Required</span>
                  <strong>ACLS, ICU Qualified</strong>
                </div>
              </div>
              <div className="selected-shift-actions">
                <div>
                  <h3>Actions</h3>
                  <span>Use these for the selected shift only.</span>
                </div>
                <Link className="command-button" href={`/app/swaps?slotId=${selectedShift.id}`}>
                  <RefreshCw size={16} /> Request Swap
                </Link>
                <button className="command-button" type="button">
                  <MessageSquare size={16} /> Message Manager
                </button>
                <button className="command-button" type="button">
                  <CalendarPlus size={16} /> Add Calendar
                </button>
                <button className="command-button" type="button">
                  <Send size={16} /> Ask Copilot
                </button>
              </div>
            </div>
          ) : (
            <EmployeeEmptyState kind="NO_SCHEDULE" />
          )}
        </aside>
      </div>

      <section className="panel full-calendar-panel" aria-labelledby="schedule-calendar-heading">
        <div className="section-heading">
          <div>
            <h2 id="schedule-calendar-heading">Calendar view</h2>
            <span>Select a shift from any day to update the selected shift card.</span>
          </div>
          <span>{shifts.length} visible shifts</span>
        </div>
        <div className="schedule-calendar-full">
          {schedule.groups.map((group) => (
            <article className="schedule-calendar-day" key={group.dateKey}>
              <strong>{group.label}</strong>
              <span>{group.shifts.length} shift{group.shifts.length === 1 ? "" : "s"}</span>
              <div className="schedule-calendar-items">
                {group.shifts.map((shift) => {
                  const isSelected = selectedShift?.id === shift.id;
                  return (
                    <button
                      aria-label={shiftButtonLabel(shift)}
                      aria-pressed={isSelected}
                      className={`schedule-calendar-item schedule-calendar-item-${shift.statusTone}${isSelected ? " is-selected" : ""}`}
                      key={shift.id}
                      onClick={() => setSelectedShiftId(shift.id)}
                      type="button"
                    >
                      <b>{shift.startsLabel}</b>
                      <span>{shift.title}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
