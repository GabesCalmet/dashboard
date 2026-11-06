"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { X, Share, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

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

// Permanent (never show again) — only ever set by the explicit checkbox,
// or once the app is actually installed. Session-only (just hide for this
// visit) — set whenever the banner is closed without checking that box,
// so closing it isn't mistaken for "stop asking forever" the way a bare X
// button usually is; it just comes back next time instead.
const PERMANENT_DISMISS_KEY = "upfront-install-prompt-dismissed";
const SESSION_DISMISS_KEY = "upfront-install-prompt-dismissed-session";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    try {
      const permanentlyDismissed = localStorage.getItem(PERMANENT_DISMISS_KEY) === "1";
      const dismissedThisSession = sessionStorage.getItem(SESSION_DISMISS_KEY) === "1";
      if (permanentlyDismissed || dismissedThisSession) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- classic SSR-safe client-only check: server and first client render must match, so the real value can only be known once mounted.
        setHidden(true);
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
      if (dontShowAgain) {
        localStorage.setItem(PERMANENT_DISMISS_KEY, "1");
      } else {
        sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
      }
    } catch {
      // Ignore — worst case the banner reappears next visit/page.
    }
    setHidden(true);
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    // Spent either way — a BeforeInstallPromptEvent can only be prompted
    // once, so the banner can't offer a retry from this same event
    // regardless of outcome. What matters is NOT treating a cancel as
    // "never ask again": only an actual accept gets the permanent flag;
    // a cancel just hides for this visit (see dismiss()'s session key),
    // so the banner naturally comes back next time Chrome offers a fresh
    // install prompt.
    try {
      if (outcome === "accepted") {
        localStorage.setItem(PERMANENT_DISMISS_KEY, "1");
      } else {
        sessionStorage.setItem(SESSION_DISMISS_KEY, "1");
      }
    } catch {
      // Ignore — worst case the banner reappears next visit/page.
    }
    setHidden(true);

    if (outcome === "accepted") {
      toast.success("Instalando... o ícone deve aparecer na gaveta de apps em instantes.");
    } else {
      toast.info("Instalação cancelada — nada foi instalado.");
    }
  }

  const visible = !hidden && (showIosHint || deferredPrompt !== null);
  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-card px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        <div className="flex items-center gap-3">
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
        <div className="flex items-center gap-2 pl-[52px]">
          <Checkbox
            id="install-prompt-dont-show-again"
            checked={dontShowAgain}
            onCheckedChange={(v) => setDontShowAgain(v === true)}
          />
          <Label
            htmlFor="install-prompt-dont-show-again"
            className="text-xs font-normal text-muted-foreground"
          >
            Não mostrar novamente
          </Label>
        </div>
      </div>
    </div>
  );
}
