import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import crypto from 'node:crypto'
import { z } from 'zod'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (request, response) => {
    const createMealBodySchema = z.object({
      name: z.string(),
      description: z.string(),
      isOnTheDiet: z.boolean(),
    })

    const { name, description, isOnTheDiet } = createMealBodySchema.parse(
      request.body,
    )

    await knex('meals').insert({
      id: crypto.randomUUID(),
      user_id: crypto.randomUUID(), // gerando um id aleatório de user por enquanto
      name,
      description,
      isOnTheDiet,
    })

    return response.status(201).send()
  })

  // Listando todas refeições
  app.get('/', async () => {
    const meals = await knex('meals').select()

    return {
      meals,
    }
  })

  // Listando uma refeição
  app.get('/:id', async (request) => {
    // Capturando os parâmetros nomeados (/:id)
    // Tipando
    const getMealParamsSchema = z.object({
      id: z.string().uuid(),
    })

    const params = getMealParamsSchema.parse(request.params)

    // Buscando a refeição do db
    // Buscando na tabela meals, na coluna ID, o params.id (que é o que vem da rota)
    // .first() é para não retornar como array e sim como (existendo ou undefined)
    const meal = await knex('meals').where('id', params.id).first()

    return { meal }
  })
}
