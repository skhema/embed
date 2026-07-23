import { readFileSync } from 'fs'
import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const pkg = JSON.parse(
  readFileSync(resolve(__dirname, 'package.json'), 'utf-8')
)

export default defineConfig(({ command, mode }) => {
  const isCDNBuild = process.env.BUILD_TARGET === 'cdn'

  return {
    plugins: [
      dts({
        insertTypesEntry: true,
        outDir: 'dist',
        include: ['src/**/*'],
        exclude: ['src/**/*.test.ts'],
      }),
    ],
    server: {
      port: 5195,
    },
    build: {
      emptyOutDir: false,
      lib: {
        entry: isCDNBuild
          ? resolve(__dirname, 'src/cdn.ts')
          : {
              index: resolve(__dirname, 'src/index.ts'),
              // DOM-free entry for server / CLI consumers (see src/tokens.ts).
              tokens: resolve(__dirname, 'src/tokens.ts'),
              // DOM-free card renderer — single source of the official card
              // HTML for web, email, and contributors (see src/render/index.ts).
              render: resolve(__dirname, 'src/render/index.ts'),
              // DOM-free copy-ready snippet generator for authoring surfaces
              // (contributor app, CLI, agent skills — see src/snippets/index.ts).
              snippets: resolve(__dirname, 'src/snippets/index.ts'),
            },
        formats: isCDNBuild ? ['umd'] : ['es', 'cjs'],
        fileName: (format, entryName) => {
          if (isCDNBuild) {
            return 'embed.min.js'
          }
          if (format === 'es') return `${entryName}.es.js`
          if (format === 'cjs') return `${entryName}.cjs`
          return `${entryName}.js`
        },
        name: 'SkhemaEmbed',
      },
      rollupOptions: {
        // npm builds resolve @skhema/method as a regular (public) dependency;
        // the CDN build bundles it so third-party pages stay single-file.
        external: isCDNBuild ? [] : [/^@skhema\/method(\/|$)/],
      },
      minify: isCDNBuild ? 'terser' : false,
      sourcemap: true,
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(
        process.env.NODE_ENV || 'development'
      ),
      // Generated snippets pin their CDN script to the version being built —
      // the pin can never drift from the published package.
      __EMBED_VERSION__: JSON.stringify(pkg.version),
    },
  }
})
