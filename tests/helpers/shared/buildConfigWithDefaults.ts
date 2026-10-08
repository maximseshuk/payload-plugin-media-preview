import { en } from '@payloadcms/translations/languages/en'
import { testDatabase } from '@seshuk/payload-plugin-tooling/test-database'
import type { CollectionConfig, Config, SanitizedConfig } from 'payload'
import { buildConfig } from 'payload'
import { ru } from 'payload/i18n/ru'

export const devUser = {
  email: 'dev@example.com',
  password: 'test',
}

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [],
}

export const buildConfigWithDefaults = async (config: Partial<Config> = {}): Promise<SanitizedConfig> => {
  const { admin, collections = [], i18n, typescript, ...rest } = config

  return await buildConfig({
    db: await testDatabase(),
    onInit: async (payload) => {
      const existingUser = await payload.find({
        collection: 'users',
        overrideAccess: true,
        where: { email: { equals: devUser.email } },
      })

      if (existingUser.docs.length === 0) {
        await payload.create({ collection: 'users', data: devUser, overrideAccess: true })
      }
    },
    secret: process.env.PAYLOAD_SECRET || 'test-secret-key',
    telemetry: false,
    ...rest,
    admin: {
      autoLogin: devUser,
      ...admin,
    },
    collections: [Users, ...collections],
    i18n: {
      ...i18n,
      supportedLanguages: { en, ru, ...i18n?.supportedLanguages },
    },
    typescript: {
      autoGenerate: false,
      ...typescript,
      declare: { ignoreTSError: true, ...typescript?.declare },
    },
  })
}
