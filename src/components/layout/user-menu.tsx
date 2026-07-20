"use client";

import Link from "next/link";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/server/actions/auth";
import { roleLabel } from "@/components/layout/nav-config";
import type { Role } from "@prisma/client";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function UserMenu({
  name,
  email,
  role,
  avatarUrl,
  settingsHref,
}: {
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string | null;
  settingsHref: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-secondary">
        <Avatar className="size-8">
          {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="hidden text-left leading-tight md:block">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{roleLabel[role]}</p>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <UserIcon /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={settingsHref}>
            <Settings /> Configurações
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => logoutAction()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
