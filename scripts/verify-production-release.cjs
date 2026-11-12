// Defesa operacional: não representa aprovação imposta por IAM.
const { execFileSync } = require('node:child_process');
function verify(env = process.env, head = () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()) {
  if (env.AWS_APP_ID !== 'd312p1jp7kl7kp' || env.AWS_BRANCH !== 'main') throw new Error('Destino diferente do app/branch de produção autorizado.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{5,79}$/.test(env.FAITH_PRODUCTION_RELEASE_ID || '')) throw new Error('Build sem releaseId aprovado.');
  if (!/^[a-f0-9]{40}$/.test(env.FAITH_PRODUCTION_RELEASE_COMMIT || '') || head() !== env.FAITH_PRODUCTION_RELEASE_COMMIT) throw new Error('Checkout diverge do commit aprovado; publicação bloqueada.');
  console.log('Release de produção validada:', env.FAITH_PRODUCTION_RELEASE_ID, env.FAITH_PRODUCTION_RELEASE_COMMIT);
}
module.exports = { verify };
if (require.main === module) { try { verify(); } catch (error) { console.error(error.message); process.exitCode = 1; } }
