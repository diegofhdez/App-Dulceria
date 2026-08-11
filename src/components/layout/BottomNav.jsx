import { NavLink } from 'react-router-dom'
import { ScanLine, Users, LineChart, PackageSearch } from 'lucide-react'
import { clsx } from 'clsx'

export function BottomNav() {
  const navItems = [
    { to: '/scanner', icon: ScanLine, label: 'Vender' },
    { to: '/inventario', icon: PackageSearch, label: 'Inventario' },
    { to: '/deudas', icon: Users, label: 'Deudas' },
    { to: '/corte', icon: LineChart, label: 'Corte' }
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 px-2 pb-safe z-50">
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) => clsx(
            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
            isActive ? "text-purple-600" : "text-slate-400 hover:text-slate-600"
          )}
        >
          {({ isActive }) => (
            <>
              <Icon size={24} className={isActive ? "fill-purple-100/50" : ""} />
              <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
