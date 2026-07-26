import path from 'node:path'
import fs from 'node:fs'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** pdfjs cMap·표준 폰트를 public으로 복사 (한글 PDF 렌더용) */
function copyPdfjsAssets(): Plugin {
  const copy = () => {
    const root = path.resolve(__dirname)
    const pairs = [
      ['node_modules/pdfjs-dist/cmaps', 'public/cmaps'],
      ['node_modules/pdfjs-dist/standard_fonts', 'public/standard_fonts'],
    ] as const
    for (const [fromRel, toRel] of pairs) {
      const from = path.join(root, fromRel)
      const to = path.join(root, toRel)
      if (!fs.existsSync(from)) continue
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.cpSync(from, to, { recursive: true })
    }
  }
  return {
    name: 'copy-pdfjs-assets',
    buildStart() {
      copy()
    },
    configureServer() {
      copy()
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), copyPdfjsAssets()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
  preview: {
    host: true,
    // Cloudflare quick tunnel 등 외부 HTTPS 호스트 허용
    allowedHosts: true,
  },
})
