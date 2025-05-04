"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Menu, 
  Wallet, 
  Users,
  Settings,
  Repeat,
  X
} from "lucide-react";

interface NavbarProps {
  toggleSidebar: () => void;
  sidebarOpen: boolean;
}

export function Navbar({ toggleSidebar, sidebarOpen }: NavbarProps) {
  const pathname = usePathname();
  
  return (
    <div className="flex items-center justify-between p-4 border-b bg-background">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="md:hidden"
        >
          {sidebarOpen ? <X /> : <Menu />}
        </Button>
        <Link href="/" className="flex items-center justify-center">
          <div className="font-bold text-xl ml-2">AVA Portfolio Manager</div>
        </Link>
      </div>

      <div className="hidden md:flex space-x-1">
        <Button variant="ghost" asChild className={`flex gap-2 ${pathname === '/' ? 'bg-accent' : ''}`}>
          <Link href="/">
            <Home size={16} />
            Dashboard
          </Link>
        </Button>

        <Button variant="ghost" asChild className={`flex gap-2 ${pathname === '/agents' ? 'bg-accent' : ''}`}>
          <Link href="/agents">
            <Users size={16} />
            Agents
          </Link>
        </Button>
        
        <Button variant="ghost" asChild className={`flex gap-2 ${pathname === '/swap' ? 'bg-accent' : ''}`}>
          <Link href="/swap">
            <Repeat size={16} />
            Swap
          </Link>
        </Button>
        
        <Button variant="ghost" asChild className={`flex gap-2 ${pathname === '/wallet' ? 'bg-accent' : ''}`}>
          <Link href="/wallet">
            <Wallet size={16} />
            Wallet
          </Link>
        </Button>
        
        <Button variant="ghost" asChild className={`flex gap-2 ${pathname === '/settings' ? 'bg-accent' : ''}`}>
          <Link href="/settings">
            <Settings size={16} />
            Settings
          </Link>
        </Button>
      </div>
    </div>
  );
} 