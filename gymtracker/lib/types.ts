export interface User {
  id: number
  name: string
}

export interface ExerciseVariant {
  id: number
  name: string
  exerciseId?: number
}

export interface Exercise {
  id: number
  name: string
  order: number
  dayId?: number
  variants: ExerciseVariant[]
}

export interface Day {
  id: number
  name: string
  order: number
  exercises: Exercise[]
}

export interface Session {
  id: number
  weight: number | null
  reps: number | null
  date: string
  variantId?: number
  userId?: number
}

export type VariantSessionMap = Record<string, Session[]>
