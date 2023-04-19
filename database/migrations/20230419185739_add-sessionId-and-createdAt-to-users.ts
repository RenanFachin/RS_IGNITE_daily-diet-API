import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.uuid('session_id').after('height').index()

    table
      .text('created_at')
      .defaultTo(knex.fn.now())
      .after('session_id')
      .notNullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('session_id')
    table.dropColumn('created_at')
  })
}
