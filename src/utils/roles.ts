/**
 * Helper utilitário para checagem robusta de permissões de Administrador Master e Liderança
 */
export const checkIsMasterOrAdmin = (email?: string, role?: string): boolean => {
  if (!email && !role) return false;
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanRole = (role || '').toUpperCase().trim();

  // 1. Cargos administrativos conhecidos
  if (
    cleanRole.includes('ADMIN') ||
    cleanRole.includes('MASTER') ||
    cleanRole.includes('SUPER') ||
    cleanRole.includes('PASTOR') ||
    cleanRole.includes('DIRETOR') ||
    ['ADMIN', 'PASTOR', 'SUPERADMIN', 'MASTER_ADMIN', 'ADMINISTRADOR', 'ADMIN_MASTER', 'SUPER_ADMIN'].includes(cleanRole)
  ) {
    return true;
  }

  // 2. Contas de e-mail de Administrador Master da Plataforma Faith Hub
  const masterAccounts = [
    'rfsena@icloud.com',
    'admin@faithhubs.com',
    'contato@faithhubs.com',
    'rafaelsena@faithhubs.com',
    'master@faithhubs.com',
    'rafael@faithhubs.com'
  ];

  if (masterAccounts.includes(cleanEmail)) return true;

  if (
    cleanEmail.includes('rfsena') ||
    cleanEmail.includes('rafaelsena') ||
    cleanEmail.includes('@faithhubs.com') ||
    cleanEmail.includes('@faithhub.com') ||
    cleanEmail.startsWith('admin@') ||
    cleanEmail.startsWith('master@') ||
    cleanEmail.startsWith('pastor@')
  ) {
    return true;
  }

  return false;
};
