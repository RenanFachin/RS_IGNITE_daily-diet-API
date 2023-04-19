import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import crypto from 'node:crypto'
import { z } from 'zod'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (request, response) => {
    // Só deixar criar uma refeição caso o usuário tenha um cookie
    const sessionId = request.cookies.sessionId

    if (!sessionId) {
      return response.status(401).send({
        error: 'Unauthorized',
      })
    }
    // console.log(sessionId)

    // A partir deste sessionID, buscar os dados na tabela users para adicionar durante a criação de uma nova refeição na tabela meals
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
