"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Share, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// Chrome/Android fire this before showing their own install UI — capturing
// it lets a page show its own button and trigger the native prompt on
// demand instead of waiting for the browser's own (easy to miss) cue.
// Not in the standard DOM lib types, so declared by hand here.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// iOS Safari has no equivalent event — Apple only ever allows "Adicionar
// à Tela de Início" through its own Share sheet, for any website, with no
// way for a page to trigger it directly. navigator.standalone (iOS-only,
// not in standard types) is how a page tells whether it's already running
// installed, same job matchMedia("display-mode: standalone") does elsewhere.
interface NavigatorWithIosStandalone extends Navigator {
  standalone?: boolean;
}

const DISMISS_KEY = "upfront-install-prompt-dismissed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissedByUser, setDismissedByUser] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- classic SSR-safe client-only check: server and first client render must match, so the real value can only be known once mounted.
        setDismissedByUser(true);
        return;
      }
    } catch {
      // Private browsing or storage blocked — just don't persist dismissal.
    }

    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as NavigatorWithIosStandalone).standalone === true;
    if (isStandalone) return;

    const ua = window.navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) setShowIosHint(true);

    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // Ignore — worst case the banner reappears next visit.
    }
    setDismissedByUser(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    dismiss();
  }

  const visible = !dismissedByUser && (showIosHint || deferredPrompt !== null);
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={40}
          height={40}
          className="shrink-0 rounded-lg"
        />
        <div className="min-w-0 flex-1 text-sm">
          {deferredPrompt ? (
            <p>Instale o Upfront Portal no seu celular para acesso rápido, como um app.</p>
          ) : (
            <p>
              Toque em <Share className="inline size-3.5 align-text-bottom" /> (Compartilhar) e depois em
              &quot;Adicionar à Tela de Início&quot; para instalar o app.
            </p>
          )}
        </div>
        {deferredPrompt && (
          <Button size="sm" onClick={install} className="shrink-0">
            <Download /> Instalar
          </Button>
        )}
        <Button variant="ghost" size="icon" className="shrink-0" onClick={dismiss} aria-label="Fechar">
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}
