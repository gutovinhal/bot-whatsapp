// test_rembg.js
const { spawnSync } = require('child_process')
const path = require('path')

const pathPython = path.resolve(
  'C:/Users/augus/OneDrive/Área de Trabalho/ALL/Dev/botwhatsapp/venv-rembg/Scripts/python.exe'
)
const venvScripts = path.resolve(
  'C:/Users/augus/OneDrive/Área de Trabalho/ALL/Dev/botwhatsapp/venv-rembg/Scripts'
)
const env = { ...process.env }
env.PATH = venvScripts + path.delimiter + env.PATH

console.log('Testando rembg via', pathPython, '-m rembg -h')
const py = spawnSync(pathPython, ['-m', 'rembg', '-h'], {
  encoding: 'utf8',
  timeout: 60000,
  env
})
console.log('status:', py.status)
console.log('error:', py.error)
console.log('stderr:', py.stderr)
console.log('stdout:', py.stdout)
