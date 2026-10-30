import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin, type PluginOption } from 'vite'

function swaggerDocsPlugin(): Plugin {
  const swaggerDir = createRequire(import.meta.url)('swagger-ui-dist').getAbsoluteFSPath() as string
  const files: Record<string, readonly [string, Buffer]> = {
    'swagger-ui.css': ['text/css', readFileSync(join(swaggerDir, 'swagger-ui.css'))],
    'swagger-ui-bundle.js': ['text/javascript', readFileSync(join(swaggerDir, 'swagger-ui-bundle.js'))],
    'swagger-ui-standalone-preset.js': ['text/javascript', readFileSync(join(swaggerDir, 'swagger-ui-standalone-preset.js'))],
    'favicon-32x32.png': ['image/png', readFileSync(join(swaggerDir, 'favicon-32x32.png'))],
    'openapi.yaml': ['application/yaml', readFileSync(new URL('../../packages/shared/openapi.yaml', import.meta.url))],
  }
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>TaiwanHaul Search API</title><link rel="stylesheet" href="/api-docs/swagger-ui.css"></head>
<body><div id="swagger-ui"></div><script src="/api-docs/swagger-ui-bundle.js"></script><script src="/api-docs/swagger-ui-standalone-preset.js"></script><script>SwaggerUIBundle({url:'/api-docs/openapi.yaml',dom_id:'#swagger-ui',presets:[SwaggerUIBundle.presets.apis,SwaggerUIStandalonePreset],layout:'StandaloneLayout'})</script></body></html>`

  return {
    name: 'taiwanhaul-swagger-docs',
    applyToEnvironment: (environment) => environment.name === 'client',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const requestPath = (req.url ?? '').split('?', 1)[0]
        if (requestPath === '/api-docs' || requestPath === '/api-docs/') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.end(html)
          return
        }
        if (!requestPath.startsWith('/api-docs/')) return next()
        const file = files[basename(requestPath)]
        if (!file) return next()
        res.setHeader('Content-Type', file[0])
        res.end(file[1])
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'api-docs/index.html', source: html })
      for (const [name, [, source]] of Object.entries(files)) {
        this.emitFile({ type: 'asset', fileName: `api-docs/${name}`, source })
      }
    },
  }
}

const plugins: PluginOption[] = [react(), tailwindcss(), cloudflare()]
if (process.env.VITE_API_DOCS === '1') plugins.push(swaggerDocsPlugin())

export default defineConfig({
  plugins,
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  environments: { client: { build: { rollupOptions: { input: ['index.html', 'privacy.html'] } } } },
})
