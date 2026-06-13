import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const routine = [
  {
    name: 'Push',
    order: 1,
    exercises: [
      { name: 'Press Banca', variants: ['Barra', 'Mancuernas'] },
      { name: 'Press Inclinado', variants: ['Mancuernas', 'Máquina'] },
      { name: 'Aperturas', variants: ['Polea', 'Mancuernas'] },
    ],
  },
  {
    name: 'Pull',
    order: 2,
    exercises: [
      { name: 'Dominadas', variants: ['Peso corporal', 'Lastradas'] },
      { name: 'Remo', variants: ['Barra', 'Mancuernas', 'Polea baja'] },
    ],
  },
  {
    name: 'Pierna',
    order: 3,
    exercises: [
      { name: 'Sentadilla', variants: ['Barra', 'Smith'] },
      { name: 'Prensa', variants: ['Máquina'] },
      { name: 'Curl femoral', variants: ['Máquina tumbado', 'Polea'] },
    ],
  },
]

async function main() {
  await prisma.user.upsert({
    where: { name: 'Josemi' },
    update: {},
    create: { name: 'Josemi' },
  })
  await prisma.user.upsert({
    where: { name: 'Alba' },
    update: {},
    create: { name: 'Alba' },
  })

  for (const day of routine) {
    await prisma.day.create({
      data: {
        name: day.name,
        order: day.order,
        exercises: {
          create: day.exercises.map((e, index) => ({
            order: index + 1,
            exercise: {
              create: {
                name: e.name,
                variants: { create: e.variants.map((v) => ({ name: v })) },
              },
            },
          })),
        },
      },
    })
  }

  console.log('Seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
