const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(__dirname, '../src/components/DigitalMemberCard.tsx'),
  'utf8'
);

test('digital member card keeps only the active face visible across WebKit browsers', () => {
  assert.match(source, /WebkitTransformStyle:\s*'preserve-3d'/);
  assert.equal((source.match(/WebkitBackfaceVisibility:\s*'hidden'/g) || []).length, 2);
  assert.match(source, /opacity:\s*isFlipped \? 0 : 1/);
  assert.match(source, /opacity:\s*isFlipped \? 1 : 0/);
  assert.match(source, /pointerEvents:\s*isFlipped \? 'none' : 'auto'/);
  assert.match(source, /pointerEvents:\s*isFlipped \? 'auto' : 'none'/);
});

test('profile avoids repeating identity details below the digital member card', () => {
  const profile = fs.readFileSync(path.join(__dirname, '../src/pages/Profile.tsx'), 'utf8');
  assert.match(profile, /hasDigitalMemberCard \? 'Gerenciar perfil'/);
  assert.match(profile, /hasDigitalMemberCard \? 'Foto e dados pessoais'/);
  assert.match(profile, /Trocar foto/);
  assert.match(profile, /Editar dados/);
  assert.doesNotMatch(profile, /Card Principal de Perfil do Membro/);
});
