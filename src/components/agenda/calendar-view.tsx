"use client";

import { useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg } from "@fullcalendar/core";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { LessonDetailDialog } from "@/components/agenda/lesson-detail-dialog";
import "@/components/agenda/calendar-view.css";

export type CalendarLessonEvent = {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  status: string;
  statusLabel: string;
  durationMin: number;
  contentTaught: string | null;
  homework: string | null;
  observations: string | null;
  start: string;
};

export function CalendarView({
  canManageLessons,
  isTeacherView,
}: {
  canManageLessons: boolean;
  isTeacherView: boolean;
}) {
  const [selected, setSelected] = useState<CalendarLessonEvent | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  function handleEventClick(arg: EventClickArg) {
    const props = arg.event.extendedProps;
    setSelected({
      id: arg.event.id,
      studentId: props.studentId,
      studentName: props.studentName,
      teacherId: props.teacherId,
      teacherName: props.teacherName,
      status: props.status,
      statusLabel: props.statusLabel,
      durationMin: props.durationMin,
      contentTaught: props.contentTaught,
      homework: props.homework,
      observations: props.observations,
      start: arg.event.startStr,
    });
  }

  return (
    <div className="upfront-calendar rounded-xl border bg-card p-3 sm:p-4">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={ptBrLocale}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
        }}
        height="auto"
        events={(info, success, failure) => {
          fetch(`/api/lessons?start=${info.startStr}&end=${info.endStr}`)
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
    </div>
  );
}
