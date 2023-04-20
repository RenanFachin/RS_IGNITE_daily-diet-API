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
        return response.status(404).send({
          error: 'Refeição não encontrada',
        })
      }

      return { meal }
    },
  )

  // Apagando uma refeição cadastrada
  app.delete(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const params = getMealParamsSchema.parse(request.params)

      // Buscando o usuário
      const { sessionId } = request.cookies

      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')

      const userId = user.id

      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()
        .delete()

      if (!meal) {
        return response.status(401).send({
          error: 'Unauthorized',
        })
      }

      return response.status(202).send('Refeição deletada com sucesso')
    },
  )

  // Editando uma refeição cadastrada
  app.put(
    '/:id',
    { preHandler: [checkSessionIdExists] },
    async (request, response) => {
      // Capturando o parâmetro id pelos params e tipando
      const getMealParamsSchema = z.object({
        id: z.string().uuid(),
      })

      const params = getMealParamsSchema.parse(request.params)

      // Buscando o usuário partir dos cookies
      const { sessionId } = request.cookies

      // Buscando o id do usuário com base no session_id
      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')

      const userId = user.id

      // Validando e capturando o que o usuário está mandando pelo body
      const editMealBodySchema = z.object({
        name: z.string(),
        description: z.string(),
        isOnTheDiet: z.boolean(),
      })

      const { name, description, isOnTheDiet } = editMealBodySchema.parse(
        request.body,
      )

      // Buscando a refeição existente, passando o id que veio por params e o id do usuário capturado pelo session_id
      const meal = await knex('meals')
        .where('id', params.id)
        .andWhere('user_id', userId)
        .first()
        .update({
          name,
          description,
          isOnTheDiet,
        })

      // Caso não seja encontrada no db
      if (!meal) {
        return response.status(401).send({
          error: 'Refeição não encontrada',
        })
      }

      return response.status(202).send()
    },
  )

  // Resumo das refeições
  app.get(
    '/summary',
    { preHandler: [checkSessionIdExists] },
    async (request) => {
      // .sum('coluna') => Soma a quantidade de valores de uma coluna do db

      // Buscando o usuário
      const { sessionId } = request.cookies

      const [user] = await knex('users')
        .where('session_id', sessionId)
        .select('id')

      const userId = user.id

      const [count] = await knex('meals')
        .count('id', {
          as: 'Total de refeições registradas',
        })
        .where('user_id', userId)

      const refDieta = await knex('meals')
        .count('id', { as: 'Total de refeições dentro da dieta' })
        .where('isOnTheDiet', true)
        .andWhere('user_id', userId)

      const refForaDieta = await knex('meals')
        .count('id', { as: 'Total de refeições fora da dieta' })
        .where('isOnTheDiet', false)
        .andWhere('user_id', userId)

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
    },
  )
}
