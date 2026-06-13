'use client'

interface Props {
  value: number | ''
  onChange: (value: number | '') => void
}

export default function RepsInput({ value, onChange }: Props) {
  return (
    <input
      type="number"
      step={1}
      min={1}
      placeholder="reps"
      value={value}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className="min-h-[44px] w-full rounded border border-[#2a2a2a] bg-[#0f0f0f] px-3 py-2 text-right tabular-nums text-white outline-none focus:border-[#e8ff47]"
    />
  )
}
