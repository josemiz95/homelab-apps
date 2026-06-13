'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/routine', label: 'Rutina' },
  { href: '/manage', label: 'Gestionar' },
]

export default function NavBar() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-[#2a2a2a] bg-[#0f0f0f]">
      <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between px-4">
        <span className="text-sm text-[#666]">GymTracker</span>
        <div className="flex gap-6">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/')
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-semibold transition-colors ${
                  active ? 'text-[#e8ff47]' : 'text-[#f5f5f5] hover:text-[#e8ff47]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
