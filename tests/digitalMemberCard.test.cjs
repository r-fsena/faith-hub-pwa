const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/components/DigitalMemberCard.tsx'),
  'utf8'
);

test('digital member card renders exactly one face instead of stacking 3D layers', () => {
  assert.match(source, /\{!isFlipped && \(/);
  assert.match(source, /\{isFlipped && \(/);
  assert.doesNotMatch(source, /preserve-3d/);
  assert.doesNotMatch(source, /translateZ\(1px\)/);
  assert.doesNotMatch(source, /WebkitBackfaceVisibility/);
});

test('profile avoids repeating identity details below the digital member card', () => {
  const profile = fs.readFileSync(path.join(__dirname, '../src/pages/Profile.tsx'), 'utf8');
  assert.match(profile, /hasDigitalMemberCard \? 'Gerenciar perfil'/);
  assert.match(profile, /hasDigitalMemberCard \? 'Foto e dados pessoais'/);
  assert.match(profile, /Trocar foto/);
  assert.match(profile, /Editar dados/);
  assert.doesNotMatch(profile, /Card Principal de Perfil do Membro/);
});
