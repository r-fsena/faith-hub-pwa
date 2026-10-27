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

test('digital member card keeps flipping on the card and uses its header for profile editing', () => {
  assert.match(source, /onEdit\?: \(\) => void/);
  assert.match(source, /onClick=\{onEdit\}/);
  assert.match(source, /Editar dados/);
  assert.match(source, /Toque no cartão para ver o verso/);
  assert.match(source, /Toque no cartão para voltar/);
  assert.match(source, /onClick=\{\(\) => setIsFlipped\(current => !current\)\}/);
  assert.doesNotMatch(source, /Ver Frente/);
  assert.doesNotMatch(source, /Ver Verso/);
});

test('profile avoids duplicate identity details and integrates photo editing', () => {
  const profile = fs.readFileSync(path.join(__dirname, '../src/pages/Profile.tsx'), 'utf8');
  assert.match(profile, /onEdit=\{\(\) => setIsEditProfileOpen\(true\)\}/);
  assert.match(profile, /\{!hasDigitalMemberCard && \(/);
  assert.match(profile, /onClick=\{\(\) => openAvatarPicker\(true\)\}/);
  assert.match(profile, /Alterar foto/);
  assert.doesNotMatch(profile, /Gerenciar perfil/);
  assert.doesNotMatch(profile, /Foto e dados pessoais/);
  assert.doesNotMatch(profile, /Card Principal de Perfil do Membro/);
});
