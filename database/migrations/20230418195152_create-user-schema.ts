import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary()
    table.text('name').notNullable()
    table.text('email').notNullable()
    table.text('adress').notNullable()
    table.decimal('weight', 5, 2).notNullable() // 5 é o número total de dígitos (antes e depois) e 2 é o número de dígitos que podem ser armazenados após o ponto decimal
    table.decimal('height', 3, 0).notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('users')
}
