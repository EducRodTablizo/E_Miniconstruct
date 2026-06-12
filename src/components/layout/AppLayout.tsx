import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext'

function LayoutContent({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? 'md:ml-[60px]' : 'md:ml-64'
        }`}
      >
        <div className="p-6 pt-16 md:pt-6">
          {children}
        </div>
      </main>
    </div>
  )
}

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <LayoutContent>{children}</LayoutContent>
    </SidebarProvider>
  )
}
