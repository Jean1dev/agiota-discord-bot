/**
 * Contrato para verificação de permissões administrativas.
 * Desacoplado da implementação concreta para facilitar testes.
 */
export interface AuthorizationService {
  isAdmin(userId: string): Promise<boolean>
}

/**
 * Implementação baseada em Discord User IDs configurados via variável de ambiente.
 *
 * Usa o User ID numérico do Discord (imutável) em vez do username
 * (que pode ser alterado pelo usuário a qualquer momento).
 *
 * Configuração:
 *   ADMIN_DISCORD_USER_IDS=123456789,987654321
 */
export class ConfigAuthorizationService implements AuthorizationService {
  private readonly adminIds: ReadonlySet<string>

  constructor(adminUserIds: string) {
    this.adminIds = new Set(
      adminUserIds
        .split(',')
        .map(id => id.trim())
        .filter(Boolean),
    )
  }

  async isAdmin(userId: string): Promise<boolean> {
    return this.adminIds.has(userId)
  }

  /** Total de admins configurados — útil para diagnóstico. */
  get adminCount(): number {
    return this.adminIds.size
  }
}
