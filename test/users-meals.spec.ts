import { it, beforeAll, beforeEach, afterAll, describe, expect } from 'vitest'
import { execSync } from 'node:child_process'
import supertestRequest from 'supertest'
import { app } from '../src/app'
import { knex } from '../src/database'

describe('Users/meals routes', () => {
  // Before all é para garantir que os plugins tenham sido "ligados" antes de executar os testes
  beforeAll(async () => {
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    execSync('npm run knex migrate:rollback --all')
    execSync('npm run knex migrate:latest')
  })

  it('should be able to create a new account', async () => {
    // .server => é o método de criar um servidor node puro no app
    // o "request" é do supertest e precisa sempre receber o servidor do node como parâmetro
    await supertestRequest(app.server)
      .post('/users')
      .send({
        name: 'Usuário_teste',
        email: 'email@email.com',
        address: 'Rua de teste',
        weight: 80.5,
        height: 174,
      })
      .expect(201)

    // Conferindo se ele criou o cookie da session_id
    // console.log(response.get('Set-Cookie'))
  })

  // Dados do novo usuário
  const email = 'teste@email.com'
  const name = 'teste'
  const address = 'Rua de teste'
  const weight = 80.5
  const height = 174

  it('should be able to create a new meal', async () => {
    // Passo 1: Precisa ter um usuário válido para que seja possível criar um novo registro de refeição
    const createUserResponse = await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })
      .expect(201)

    // Buscando os cookies que retoronam ao criar um usuário no db
    const cookies = createUserResponse.get('Set-Cookie')

    // Buscando o dado de ID do usuário no db após a criação
    const userId = await knex('users').select('id').where({ email })

    // console.log(userId)

    // Fazendo a criação do registro de uma refeição
    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste 3',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies) // enviando os cookies no cabeçalho da requisição
      .expect(201)
  })

  it('should be able to list all meals', async () => {
    // Passo 1: Precisa ter um usuário válido para que seja possível criar um novo registro de refeição
    const createUserResponse = await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })

    // Buscando os cookies que retoronam ao criar um usuário no db
    const cookies = createUserResponse.get('Set-Cookie')

    // Buscando o dado de ID do usuário no db após a criação
    const userId = await knex('users').select('id').where({ email })

    // console.log(userId)

    // Fazendo a criação do registro de uma refeição
    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste 3',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies) // enviando os cookies no cabeçalho da requisição

    const listMealsResponse = await supertestRequest(app.server)
      .get('/meals')
      .set('Cookie', cookies) // enviando os cookies no cabeçalho da requisição
      .expect(200)

    // Validando o retorno de todas as refeições -> que seja um array, com 1 objeto e que este objeto tenham as chaves id, user_id,name, description, isOnTheDiet e created_at
    // listMealsResponse.body => faria retornar um objeto que contem um array e que contem objetos
    // listMealsResponse.body.meals => faz retornar direto o array
    expect(listMealsResponse.body.meals).toEqual([
      expect.objectContaining({
        name: 'Refeição de Teste 3',
        description: 'Teste',
      }),
    ])
  })
})