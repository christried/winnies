// @ts-check
import antfu from '@antfu/eslint-config'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  antfu({
    vue: true,
    typescript: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
    rules: {
      'unicorn/filename-case': ['error', { case: 'kebabCase' }],

      'vue/max-attributes-per-line': ['error', {
        singleline: { max: 2 },
        multiline: { max: 1 },
      }],

      'node/no-process-env': 'error',
    },

    ignores: [
      'design/**',
      '.nuxt/**',
      '.output/**',
      '**/migrations/**',
      '.pnpm-store/**',
    ],
  }),
)
