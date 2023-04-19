import { FastifyInstance } from 'fastify'
import { knex } from '../database'
import crypto from 'node:crypto'
import { z } from 'zod'

// TODO plugin deve ser async
export async function usersRoutes(app: FastifyInstance) {
  app.post('/', async (request, response) => {
    // capturando os dados do usuário e validando com o zod
    const createUserBodySchema = z.object({
      name: z.string(),
      email: z.string(),
      address: z.string(),
      weight: z.number(),
      height: z.number(),
    })

    // Validando os dados do request.body para ver se bate com o schema de validação
    const { name, email, address, weight, height } = createUserBodySchema.parse(
      request.body,
    )

    // Conferindo se o email já está cadastrado
    // Selecionando todas as colunas ('*') da tabela de usuários ('from("users")') onde a coluna "email" é igual ao valor da variável "email" ('where({ email })')
    const checkUserExist = await knex
      .select('*')
      .from('users')
      .where('email', email)
      .first()

    if (checkUserExist) {
      throw new Error('Este email já está vinculado à um usuário')
    }

    await knex('users').insert({
      id: crypto.randomUUID(),
      name,
      email,
      address,
      weight,
      height,
    })

    return response.status(201).send()
  })
}
