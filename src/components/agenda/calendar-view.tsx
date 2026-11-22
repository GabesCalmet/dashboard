"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { LessonDetailDialog } from "@/components/agenda/lesson-detail-dialog";
import {
  BlockedSlotDetailDialog,
  type BlockedSlotDetail,
} from "@/components/agenda/blocked-slot-detail-dialog";
import "@/components/agenda/calendar-view.css";

export type CalendarLessonEvent = {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  status: string;
  statusLabel: string;
  isMakeup: boolean;
  durationMin: number;
  contentTaught: string | null;
  classFocus: string | null;
  homework: string | null;
  observations: string | null;
  meetLink: string | null;
  start: string;
  rescheduledTo: { id: string; scheduledAt: string; durationMin: number; status: string }[];
  rescheduledFrom: { id: string; scheduledAt: string } | null;
};

export function CalendarView({
  canManageLessons,
  isTeacherView,
  teacherIds,
}: {
  canManageLessons: boolean;
  isTeacherView: boolean;
  // Admin/coordinator only — scopes the calendar to one or more teachers'
  // lessons instead of the whole school's, e.g. accumulated from several
  // Professor search results.
  teacherIds?: string[];
}) {
  const [selected, setSelected] = useState<CalendarLessonEvent | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<BlockedSlotDetail | null>(null);
  // Starts false (matching the server-rendered markup) so hydration never
  // mismatches — the real value is only known client-side, after mount.
  const [isMobile, setIsMobile] = useState(false);
  const calendarRef = useRef<FullCalendar>(null);

  function refetchCalendar() {
    calendarRef.current?.getApi().refetchEvents();
  }

  // Only the toolbar layout adapts to phone width — Semana stays the
  // default view everywhere (matching initialView), it just renders with
  // a more compact toolbar under the breakpoint.
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 640px)");
    // Classic SSR-safe client-only check: server and the first client
    // render must match (both assume desktop), so the real value can
    // only be known once mounted.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mql.matches);

    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  function handleEventClick(arg: EventClickArg) {
    const props = arg.event.extendedProps;

    // A blocked-time background block, not a real lesson — opens its own
    // dedicated editor instead of the lesson report form.
    if (props.blocked) {
      setSelectedBlock({
        blockIndex: props.blockIndex,
        weekday: props.weekday,
        start: props.start,
        end: props.end,
        from: props.from,
        until: props.until,
        tipo: props.tipo,
        observacoes: props.observacoes,
      });
      return;
    }

    setSelected({
      id: arg.event.id,
      studentId: props.studentId,
      studentName: props.studentName,
      teacherId: props.teacherId,
      teacherName: props.teacherName,
      status: props.status,
      statusLabel: props.statusLabel,
      isMakeup: props.isMakeup,
      durationMin: props.durationMin,
      contentTaught: props.contentTaught,
      classFocus: props.classFocus,
      homework: props.homework,
      observations: props.observations,
      meetLink: props.meetLink,
      start: arg.event.startStr,
      rescheduledTo: props.rescheduledTo ?? [],
      rescheduledFrom: props.rescheduledFrom ?? null,
    });
  }

  return (
    <div className="upfront-calendar rounded-xl border bg-card p-3 sm:p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        locale={ptBrLocale}
        // On a phone, nav + title + all 4 view buttons crammed into one
        // row was wrapping onto itself unreadably — the view switcher
        // moves to its own row instead (styled in calendar-view.css to sit
        // right under the nav/title row, above the grid, rather than at
        // the very bottom where it'd need scrolling past the whole week to
        // reach), same day/week/month/list choice, just not fighting the
        // title for space.
        headerToolbar={
          isMobile
            ? { left: "prev,next today", center: "title", right: "" }
            : { left: "prev,next today", center: "title", right: "timeGridWeek,dayGridMonth,timeGridDay,listWeek" }
        }
        footerToolbar={isMobile ? { left: "", center: "timeGridWeek,dayGridMonth,timeGridDay,listWeek", right: "" } : undefined}
        height="auto"
        // The week/day time-grid views start at midnight by default, which
        // is mostly empty scroll space — classes never happen before 7am,
        // so pin the visible range to start there instead.
        slotMinTime="07:00:00"
        // Live red line marking the current time in the week/day views,
        // same as Google Calendar — ticks on its own every minute.
        nowIndicator
        events={(info, success, failure) => {
          const teacherParam = teacherIds && teacherIds.length > 0 ? `&teacherIds=${teacherIds.join(",")}` : "";
          fetch(`/api/lessons?start=${info.startStr}&end=${info.endStr}${teacherParam}`)
            .then((r) => r.json())
            .then((data) => success(data.events))
            .catch(failure);
        }}
        eventClick={handleEventClick}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
      />

      {selected && (
        <LessonDetailDialog
          lesson={selected}
          open={Boolean(selected)}
          onOpenChange={(open) => !open && setSelected(null)}
          canManage={canManageLessons}
          isTeacherView={isTeacherView}
        />
      )}

      {selectedBlock && (
        <BlockedSlotDetailDialog
          block={selectedBlock}
          open={Boolean(selectedBlock)}
          onOpenChange={(open) => !open && setSelectedBlock(null)}
          onSaved={() => {
            setSelectedBlock(null);
            refetchCalendar();
          }}
        />
      )}
    </div>
  );
}
