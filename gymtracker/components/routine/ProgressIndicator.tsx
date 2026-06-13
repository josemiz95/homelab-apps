'use client'

interface Props {
  currentWeight: number | ''
  lastWeight: number | null | undefined
  lastLastWeight: number | null | undefined
}

function formatKg(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, '')}kg`
}

export default function ProgressIndicator({ currentWeight, lastWeight, lastLastWeight }: Props) {
  if (lastWeight === undefined || lastWeight === null || currentWeight === '') return null

  // If the input still matches the last session, show that session's progress
  // vs the one before it (also covers the state right after saving).
  let reference = lastWeight
  if (currentWeight === lastWeight) {
    if (lastLastWeight === undefined || lastLastWeight === null) {
      return <span className="text-sm tabular-nums text-[#666]">= sin cambio</span>
    }
    reference = lastLastWeight
  }

  const diff = currentWeight - reference

  if (diff > 0) {
    return (
      <span className="text-sm tabular-nums text-[#4ade80]">
        ↑ +{formatKg(diff)} <span className="text-[#666]">vs sesión anterior</span>
      </span>
    )
  }
  if (diff < 0) {
    return (
      <span className="text-sm tabular-nums text-[#f87171]">
        ↓ -{formatKg(Math.abs(diff))} <span className="text-[#666]">vs sesión anterior</span>
      </span>
    )
  }
  return <span className="text-sm tabular-nums text-[#666]">= sin cambio</span>
}
