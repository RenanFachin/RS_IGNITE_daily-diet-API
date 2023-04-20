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

  // Dados do novo usuário
  const email = 'teste@email.com'
  const name = 'teste'
  const address = 'Rua de teste'
  const weight = 80.5
  const height = 174

  it('should be able to create a new account', async () => {
    // .server => é o método de criar um servidor node puro no app
    // o "request" é do supertest e precisa sempre receber o servidor do node como parâmetro
    await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })
      .expect(201)

    // Conferindo se ele criou o cookie da session_id
    // console.log(response.get('Set-Cookie'))
  })

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

  it('should be able to get a specific meals', async () => {
    const createUserResponse = await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })

    const cookies = createUserResponse.get('Set-Cookie')

    // Buscando o dado de ID do usuário no db após a criação
    const userId = await knex('users').select('id').where({ email })

    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies) // enviando os cookies no cabeçalho da requisição

    const listMealsResponse = await supertestRequest(app.server)
      .get('/meals')
      .set('Cookie', cookies) // enviando os cookies no cabeçalho da requisição
      .expect(200)

    // Recuperando o id da refeição
    const mealId = listMealsResponse.body.meals[0].id

    const getMealResponse = await supertestRequest(app.server)
      .get(`/meals/${mealId}`)
      .set('Cookie', cookies) // enviando os cookies no cabeçalho da requisição
      .expect(200)

    expect(getMealResponse.body.meal).toEqual(
      expect.objectContaining({
        name: 'Refeição de Teste',
        description: 'Teste',
      }),
    )
  })

  it('should be able to get the summary meals', async () => {
    const createUserResponse = await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })

    const cookies = createUserResponse.get('Set-Cookie')

    const userId = await knex('users').select('id').where({ email })

    // Criando 3 registros de refeição
    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste 1',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies)

    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste 2',
        description: 'Teste',
        isOnTheDiet: true,
      })
      .set('Cookie', cookies)

    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste 3',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies)

    const summaryResponse = await supertestRequest(app.server)
      .get('/meals/summary')
      .set('Cookie', cookies)
      .expect(200)

    // Buscando do retorno os valores de dentro do objeto summary
    expect(summaryResponse.body.summary).toEqual({
      'Total de refeições registradas': 3,
      'Total de refeições dentro da dieta': 1,
      'Total de refeições fora da dieta': 2,
    })
  })

  it('should be able to delete a specific meal', async () => {
    const createUserResponse = await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })

    const cookies = createUserResponse.get('Set-Cookie')

    const userId = await knex('users').select('id').where({ email })

    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies)

    const listMealsResponse = await supertestRequest(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    // Recuperando o id da refeição
    const mealId = listMealsResponse.body.meals[0].id

    await supertestRequest(app.server)
      .delete(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .expect(202)
  })

  it('Should be able to edit a meal', async () => {
    const createUserResponse = await supertestRequest(app.server)
      .post('/users')
      .send({
        name,
        email,
        address,
        weight,
        height,
      })

    const cookies = createUserResponse.get('Set-Cookie')

    const userId = await knex('users').select('id').where({ email })

    await supertestRequest(app.server)
      .post('/meals')
      .send({
        user_id: userId,
        name: 'Refeição de Teste',
        description: 'Teste',
        isOnTheDiet: false,
      })
      .set('Cookie', cookies)

    const listMealsResponse = await supertestRequest(app.server)
      .get('/meals')
      .set('Cookie', cookies)
      .expect(200)

    // Recuperando o id da refeição
    const mealId = listMealsResponse.body.meals[0].id

    await supertestRequest(app.server)
      .put(`/meals/${mealId}`)
      .set('Cookie', cookies)
      .send({
        user_id: userId,
        name: 'Refeição de Teste - EDITADA',
        description: 'Teste - EDITADO',
        isOnTheDiet: true,
      })
      .expect(202)
  })
})
