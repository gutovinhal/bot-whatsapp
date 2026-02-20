// Subcomando: debugstats
const { runDebugStats } = require('../debugstats')

module.exports = async function debugstats({ message }) {
  await runDebugStats({ message })
}
