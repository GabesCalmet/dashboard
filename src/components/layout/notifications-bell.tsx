"use client";

import { useTransition } from "react";
import { Bell, CalendarClock, BookOpen, Wallet, MessageSquare, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import type { Notification, NotificationType } from "@prisma/client";

const iconByType: Record<NotificationType, React.ElementType> = {
  LESSON_REMINDER: CalendarClock,
  HOMEWORK_AVAILABLE: BookOpen,
  PAYMENT_DUE: Wallet,
  TEACHER_OBSERVATION: MessageSquare,
  GENERAL: Info,
};

export function NotificationsBell({
  notifications,
}: {
  notifications: Notification[];
}) {
  const [isPending, startTransition] = useTransition();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notificações">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-medium text-accent-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">Notificações</p>
          {unreadCount > 0 && (
            <button
              className="text-xs text-accent hover:underline disabled:opacity-50"
              disabled={isPending}
              onClick={() => startTransition(() => markAllNotificationsRead())}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhuma notificação por aqui.
            </p>
          ) : (
            notifications.map((n) => {
              const Icon = iconByType[n.type];
              return (
                <button
                  key={n.id}
                  onClick={() =>
                    !n.read && startTransition(() => markNotificationRead(n.id))
                  }
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b px-3 py-2.5 text-left last:border-0 hover:bg-secondary/60",
                    !n.read && "bg-accent/5"
                  )}
                >
                  <div
                    className={cn(
                      "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                      n.read ? "bg-secondary" : "bg-accent/15 text-accent"
                    )}
                  >
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {formatDistanceToNow(n.createdAt, {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                  {!n.read && (
                    <Badge variant="accent" className="mt-0.5 size-2 rounded-full p-0" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
