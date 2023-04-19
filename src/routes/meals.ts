import { FastifyInstance } from 'fastify'
import { knex } from '../database'

export async function mealsRoutes(app: FastifyInstance) {
  app.post('/', async (request, response) => {
    return response.send()
  })
}
