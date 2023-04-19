// eslint-disable-next-line
import { Knex } from 'knex'

declare module 'knex/types/tables' {
  export interface Tables {
    meals: {
      id: string
      user_id: string
      name: string
      description: string
      isOnTheDiet: boolean
      created_at: string
    }
    users: {
      id: string
      name: string
      email: string
      address: string
      weight: number
      height: number
      session_id?: string
    }
  }
}
