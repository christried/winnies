/* eslint-disable node/no-process-env -- only permitted place to read raw environment */
import process from 'node:process'
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.url('DATABASE_URL must be a valid connection URL'),
  BETTER_AUTH_SECRET: z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters'),
  DISCORD_CLIENT_ID: z.string().min(1, 'DISCORD_CLIENT_ID is required'),
  DISCORD_CLIENT_SECRET: z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
  // wrong value silently falls back to the localhost default in nuxt.config.
  NUXT_PUBLIC_APP_URL: z.url('NUXT_PUBLIC_APP_URL must be a valid URL'),
})

export type Env = z.infer<typeof envSchema>

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env)

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}\n\nSee .env.example.`,
    )
  }

  return result.data
}

const env = parseEnv()

export default env
