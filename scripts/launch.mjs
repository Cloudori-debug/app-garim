/**
 * 암기노트 런처
 * 사용: node scripts/launch.cjs [dev|preview]
 */
import { spawn, exec } from 'node:child_process'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'
import http from 'node:http'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const mode = process.argv[2] === 'preview' ? 'preview' : 'dev'
const port = mode === 'preview' ? 4173 : 5173

const WINDOW = {
  dev: {
    title: '암기노트 [개발 :5173]',
    label: '개발 서버 (Vite)',
    serverTitle: '암기노트 [Vite :5173]',
  },
  preview: {
    title: '암기노트 [오프라인 :4173]',
    label: '오프라인 미리보기',
    serverTitle: '암기노트 [Preview :4173]',
  },
}

const root = join(__dirname, '..')

function quoteTitle(title) {
  return `"${title.replace(/"/g, '')}"`
}

function setConsoleTitle(title) {
  process.title = title
  if (process.platform === 'win32') {
    try {
      exec(`title ${quoteTitle(title)}`)
    } catch {
      /* ignore */
    }
  }
}

function printBanner() {
  const cfg = WINDOW[mode]
  console.log('')
  console.log('============================================')
  console.log('  암기노트')
  console.log(`  ▶ ${cfg.label}`)
  console.log(`  ▶ http://127.0.0.1:${port}`)
  console.log('  ▶ 종료: 이 창에서 Ctrl+C')
  console.log('============================================')
  console.log('')
}

function log(msg) {
  console.log(`[암기노트] ${msg}`)
}

function run(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}

function waitForPort(targetPort, timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve) => {
    function attempt() {
      if (Date.now() > deadline) {
        resolve(false)
        return
      }
      const req = http.get(`http://127.0.0.1:${targetPort}`, (res) => {
        res.resume()
        resolve(true)
      })
      req.on('error', () => {
        setTimeout(attempt, 600)
      })
      req.setTimeout(1500, () => {
        req.destroy()
        setTimeout(attempt, 600)
      })
    }
    attempt()
  })
}

function openBrowser(url) {
  if (process.platform === 'win32') {
    exec(`start "" "${url}"`)
  } else if (process.platform === 'darwin') {
    exec(`open "${url}"`)
  } else {
    exec(`xdg-open "${url}"`)
  }
}

async function ensureDependencies() {
  if (!existsSync(join(root, 'node_modules'))) {
    log('처음 실행 — npm install 중… (잠시만 기다려 주세요)')
    await run('npm', ['install'], root)
  }
}

async function ensureBuild() {
  if (!existsSync(join(root, 'dist', 'index.html'))) {
    log('빌드 파일 없음 — npm run build 중…')
    await run('npm', ['run', 'build'], root)
  }
}

function spawnInConsole(title, cmd, args, cwd) {
  if (process.platform === 'win32') {
    const quoted = args.map((a) => (/\s/.test(a) ? `"${a}"` : a)).join(' ')
    const line = `title ${quoteTitle(title)} && ${cmd} ${quoted}`
    return spawn('cmd', ['/c', line], { cwd, stdio: 'inherit' })
  }
  return spawn(cmd, args, { cwd, stdio: 'inherit', shell: true })
}

async function main() {
  const cfg = WINDOW[mode]
  setConsoleTitle(cfg.title)
  printBanner()

  log(`폴더: ${root}`)

  if (!existsSync(join(root, 'package.json'))) {
    console.error('오류: package.json을 찾을 수 없습니다.')
    console.error('실행 파일을 app_garim 프로젝트 폴더 안에 두세요.')
    process.exit(1)
  }

  await ensureDependencies()

  if (mode === 'preview') {
    await ensureBuild()
  }

  log(`서버 시작 (포트 ${port})…`)
  setConsoleTitle(cfg.serverTitle)

  let child
  if (mode === 'preview') {
    child = spawnInConsole(
      cfg.serverTitle,
      'npm',
      ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)],
      root,
    )
  } else {
    child = spawnInConsole(
      cfg.serverTitle,
      'npm',
      ['run', 'dev', '--', '--host', '127.0.0.1', '--port', String(port)],
      root,
    )
  }

  let browserOpened = false
  void waitForPort(port).then((ok) => {
    if (ok && !browserOpened) {
      browserOpened = true
      const url = `http://127.0.0.1:${port}`
      log(`브라우저 열기: ${url}`)
      openBrowser(url)
    } else if (!ok) {
      log('서버 대기 시간 초과 — 브라우저에서 주소를 직접 여세요.')
    }
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })

  process.on('SIGINT', () => child.kill('SIGINT'))
  process.on('SIGTERM', () => child.kill('SIGTERM'))
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
