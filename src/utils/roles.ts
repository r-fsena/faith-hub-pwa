/** UI affordances follow server-issued roles; email patterns never grant permissions. */
export const checkIsMasterOrAdmin = (_email?: string, role?: string): boolean => {
  const normalized = (role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  return ['ADMIN', 'PASTOR', 'SUPERADMIN', 'MASTER_ADMIN', 'ADMINISTRADOR', 'ADMIN_MASTER', 'SUPER_ADMIN', 'MASTER'].includes(normalized);
};
