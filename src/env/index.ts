import { config } from 'dotenv'
import { z } from 'zod'

if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' })
} else {
  config()
}

// Schema de validação de dados apenas das variáveis de ambiente
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('production'),
  DATABASE_CLIENT: z.enum(['sqlite', 'pg']),
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3333),
})

// _env vai pegar o envSchema, passar os dados de dentro do process.env e o zod vai validar
const _env = envSchema.safeParse(process.env)

if (_env.success === false) {
  console.error('Error: Invalid environment variables!', _env.error.format())

  // Lançando o erro para que ele pare de executar
  throw new Error('Invalid envirnment variables!')
}

// Desta maneira, podemos utilizar esta constante env em toda nossa aplicação
// _env.data são as variáveis definidas no envSchema
export const env = _env.data
