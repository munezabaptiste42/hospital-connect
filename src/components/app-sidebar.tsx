import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  BarChart3,
  UserCog,
  LogOut,
  Stethoscope,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const items: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ["admin", "doctor", "receptionist"] },
  { title: "Patients", url: "/patients", icon: Users, roles: ["admin", "doctor", "receptionist"] },
  { title: "Appointments", url: "/appointments", icon: CalendarDays, roles: ["admin", "doctor", "receptionist"] },
  { title: "Medical Reports", url: "/medical-reports", icon: FileText, roles: ["admin", "doctor", "receptionist"] },
  { title: "Reports", url: "/reports", icon: BarChart3, roles: ["admin", "receptionist"] },
  { title: "Staff", url: "/staff", icon: UserCog, roles: ["admin"] },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { role, profile, user, signOut } = useAuth();
  const visible = items.filter((i) => role && i.roles.includes(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gold text-gold-foreground">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-sidebar-foreground">King Faisal</div>
            <div className="text-[11px] text-sidebar-foreground/70">Hospital · Rwanda</div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={path.startsWith(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/40 px-2 py-2 text-sidebar-foreground">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-gold-foreground text-xs font-semibold">
            {(profile?.full_name || user?.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-medium">{profile?.full_name || user?.email}</div>
            <div className="truncate text-[10px] uppercase tracking-wide text-sidebar-foreground/70">{role}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={signOut} className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-accent" aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
