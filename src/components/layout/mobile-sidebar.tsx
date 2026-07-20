"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { NavItem } from "@/components/layout/nav-config";

export function MobileSidebar({ items }: { items: NavItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir menu"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="left-0 top-0 h-full w-64 max-w-[80vw] translate-x-0 translate-y-0 rounded-none border-0 border-r p-0 sm:rounded-none"
        >
          <DialogTitle className="sr-only">Menu de navegação</DialogTitle>
          <SidebarNav items={items} onNavigate={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
