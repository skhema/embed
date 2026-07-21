import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

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
    },
  }
})
