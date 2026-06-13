'use client'

import type { User } from '@/lib/types'

interface Props {
  users: User[]
  activeUser: User
  onChange: (user: User) => void
}

export default function UserToggle({ users, activeUser, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {users.map((user) => {
        const active = user.id === activeUser.id
        return (
          <button
            key={user.id}
            onClick={() => onChange(user)}
            className={`min-h-[44px] rounded px-4 py-2 text-sm transition-colors ${
              active
                ? 'bg-[#e8ff47] font-bold text-black'
                : 'border border-[#2a2a2a] bg-[#1a1a1a] text-[#666]'
            }`}
          >
            {user.name}
          </button>
        )
      })}
    </div>
  )
}
