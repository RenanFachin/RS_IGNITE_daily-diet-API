import { it, beforeAll, afterAll, describe } from 'vitest'
import supertestRequest from 'supertest'
import { app } from '../src/app'

describe('Users routes', () => {
  // Before all é para garantir que os plugins tenham sido "ligados" antes de executar os testes
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should be able to create a new account', async () => {
    // .server => é o método de criar um servidor node puro no app
    // o "request" é do supertest e precisa sempre receber o servidor do node como parâmetro
    await supertestRequest(app.server)
      .post('/users')
      .send({
        name: 'Usuário_test',
        email: 'email@email.com',
        address: 'Rua de teste',
        weight: 80.5,
        height: 174,
      })
      .expect(201)
  })
})
