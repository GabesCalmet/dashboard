"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The open teacher tabs live entirely in the URL (?teacherIds=&active=),
// so a plain navigation away and back — e.g. via the sidebar's Agenda
// link, which carries no query string at all — silently drops every tab
// that was open. This keeps a copy in localStorage whenever there's
// something to remember, and restores it on a bare page load (no
// teacherIds in the URL) instead of landing on an empty board.
export function AgendaTabsPersistence({
  basePath,
  teacherIds,
  active,
  // True only right after the last tab was explicitly closed (the X on
  // the last chip) — an empty teacherIds from THAT click means "I want
  // zero tabs," which must not be confused with an empty teacherIds from
  // a plain sidebar navigation, which means "the URL just doesn't say,"
  // so restoring is right. See the admin/coordinator pages' removeHref
  // for where this flag comes from.
  explicitlyClosed = false,
}: {
  basePath: string;
  teacherIds: string[];
  active?: string;
  explicitlyClosed?: boolean;
}) {
  const router = useRouter();
  const storageKey = `agenda-tabs:${basePath}`;

  useEffect(() => {
    if (explicitlyClosed) {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // Private browsing/storage disabled — nothing to clear.
      }
      router.replace(basePath);
      return;
    }

    if (teacherIds.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ teacherIds, active }));
      } catch {
        // Private browsing/storage disabled — tabs just won't persist.
      }
      return;
    }

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as { teacherIds?: string[]; active?: string };
      if (saved.teacherIds && saved.teacherIds.length > 0) {
        router.replace(
          `${basePath}?teacherIds=${saved.teacherIds.join(",")}&active=${saved.active ?? saved.teacherIds[0]}`
        );
      }
    } catch {
      // Corrupt/unavailable storage — nothing to restore, stay as-is.
    }
    // Reacts only to the URL's own open-tabs scope — basePath/router
    // never change for a mounted instance of this component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherIds.join(","), active, explicitlyClosed]);

  return null;
}
