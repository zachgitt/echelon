"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Users, UsersRound, Network, ScrollText } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Search",
    href: "/search",
    icon: Search,
  },
  {
    title: "Employee Directory",
    href: "/employees",
    icon: Users,
  },
  {
    title: "Team Directory",
    href: "/teams",
    icon: UsersRound,
  },
  {
    title: "Organizational Chart",
    href: "/org-chart",
    icon: Network,
  },
  {
    title: "Audit Log",
    href: "/audit-log",
    icon: ScrollText,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Network className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold">Echelon</span>
            <span className="text-xs text-muted-foreground">Org Management</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
