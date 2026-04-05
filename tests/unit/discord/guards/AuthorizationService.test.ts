import { ConfigAuthorizationService } from '../../../../src/discord/guards/AuthorizationService'

describe('ConfigAuthorizationService', () => {
  it('reconhece um ID admin configurado', async () => {
    const svc = new ConfigAuthorizationService('111,222,333')
    expect(await svc.isAdmin('111')).toBe(true)
    expect(await svc.isAdmin('222')).toBe(true)
    expect(await svc.isAdmin('333')).toBe(true)
  })

  it('nega IDs não configurados', async () => {
    const svc = new ConfigAuthorizationService('111,222')
    expect(await svc.isAdmin('999')).toBe(false)
    expect(await svc.isAdmin('')).toBe(false)
  })

  it('ignora espaços em branco ao redor dos IDs', async () => {
    const svc = new ConfigAuthorizationService('  111 , 222  ,333')
    expect(await svc.isAdmin('111')).toBe(true)
    expect(await svc.isAdmin('222')).toBe(true)
    expect(await svc.isAdmin('333')).toBe(true)
  })

  it('funciona com string vazia (sem admins)', async () => {
    const svc = new ConfigAuthorizationService('')
    expect(await svc.isAdmin('111')).toBe(false)
    expect(svc.adminCount).toBe(0)
  })

  it('funciona com um único ID', async () => {
    const svc = new ConfigAuthorizationService('42')
    expect(await svc.isAdmin('42')).toBe(true)
    expect(await svc.isAdmin('43')).toBe(false)
    expect(svc.adminCount).toBe(1)
  })

  it('não confunde username com User ID', async () => {
    // username pode ser igual ao ID por coincidência — mas o campo usado é sempre author.id
    const svc = new ConfigAuthorizationService('jeanlucafp')
    expect(await svc.isAdmin('jeanlucafp')).toBe(true)   // só se for o ID
    expect(await svc.isAdmin('123456789')).toBe(false)   // ID numérico real não está na lista
  })
})
