import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import crypto from 'node:crypto'
import { z } from 'zod'
import { checkSessionIdExists } from '../middleware/check-session-id-exists'

export async function mealsRoutes(app: FastifyInstance) {
  app.post(
    '/',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      const { sessionId } = request.cookies

      // A partir deste sessionID, buscar os dados na tabela users para adicionar durante a criação de uma nova refeição na tabela meals
      // Desestruturando o user para depois armazenar apenas o seu ID na variável userID
      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')

      const userId = user.id
      // console.log(userId)

      // Após a identificação do usuário, armazendo o dado de seu id para posteriormente adicionar na tabela de meals junto ao prato
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
        user_id: userId,
        name,
        description,
        isOnTheDiet,
      })

      return response.status(201).send()
    },
  )

  // Listando todas refeições apenas do usuário
  app.get('/', { preHandler: [checkSessionIdExists] }, async (request) => {
    const { sessionId } = request.cookies

    const [user] = await knex('users')
      .where('session_id', sessionId)
      .select('id')

    const userId = user.id

    // .where('user_id', userId) -> Selecionar apenas onde a coluna user_id seja correspondende ao id do usuário que criou o prato
    const meals = await knex('meals').where('user_id', userId).select()

    return {
      meals,
    }
  })

  // Listando uma refeição específica do usuário
  app.get(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      // Capturando os parâmetros nomeados (/:id)
      // Tipando
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const params = getMealParamsSchema.parse(request.params)
      const { sessionId } = request.cookies

      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')

      const userId = user.id

      // Buscando a refeição do db
      // Buscando na tabela meals, na coluna ID, o params.id (que é o que vem da rota)
      // .first() é para não retornar como array e sim como (existendo ou undefined)
      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()

      if (!meal) {
        return response.status(401).send({
          error: 'Unauthorized',
        })
      }

      return { meal }
    },
  )

  // Resumo das refeições
  app.get('/summary', async () => {
    // .sum('coluna') => Soma a quantidade de valores de uma coluna do db

    const [count] = await knex('meals').count('id', {
      as: 'Total de refeições registradas',
    })

    const refDieta = await knex('meals')
      .count('id', { as: 'Total de refeições dentro da dieta' })
      .where('isOnTheDiet', true)

    const refForaDieta = await knex('meals')
      .count('id', { as: 'Total de refeições fora da dieta' })
      .where('isOnTheDiet', false)

    const summary = {
      'Total de refeições registradas': parseInt(
        JSON.parse(JSON.stringify(count))['Total de refeições registradas'],
      ),

      'Total de refeições dentro da dieta': parseInt(
        JSON.parse(JSON.stringify(refDieta))[0][
        'Total de refeições dentro da dieta'
        ],
      ),

      'Total de refeições fora da dieta': parseInt(
        JSON.parse(JSON.stringify(refForaDieta))[0][
        'Total de refeições fora da dieta'
        ],
      ),
    }

    return {
      summary,
    }
  })
}
