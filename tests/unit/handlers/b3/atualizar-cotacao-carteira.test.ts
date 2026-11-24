import axios from 'axios'
import {
  getLogoFromBrapi,
  imgScrapeBing,
} from '../../../../src/handlers/b3/atualizar-cotacao-carteira'

jest.mock('axios')
jest.mock('../../../../src/shared/logger/Logger', () => ({
  createLogger: () => ({ debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() }),
}))

const mockedAxios = axios as jest.Mocked<typeof axios>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getLogoFromBrapi', () => {
  it('retorna o icone do ticker completo quando existe', async () => {
    mockedAxios.head.mockResolvedValueOnce({ status: 200 } as never)

    const url = await getLogoFromBrapi('KLBN11')

    expect(url).toBe('https://icons.brapi.dev/icons/KLBN11.svg')
    expect(mockedAxios.head).toHaveBeenCalledTimes(1)
    expect(mockedAxios.head).toHaveBeenCalledWith(
      'https://icons.brapi.dev/icons/KLBN11.svg',
      expect.objectContaining({ timeout: 8000 }),
    )
  })

  it('cai para a raiz do ticker quando o ticker completo da 404', async () => {
    mockedAxios.head
      .mockResolvedValueOnce({ status: 404 } as never)
      .mockResolvedValueOnce({ status: 200 } as never)

    const url = await getLogoFromBrapi('cple6')

    expect(url).toBe('https://icons.brapi.dev/icons/CPLE.svg')
    expect(mockedAxios.head).toHaveBeenNthCalledWith(
      1,
      'https://icons.brapi.dev/icons/CPLE6.svg',
      expect.anything(),
    )
  })

  it('retorna null quando nenhum candidato existe', async () => {
    mockedAxios.head
      .mockResolvedValueOnce({ status: 404 } as never)
      .mockResolvedValueOnce({ status: 404 } as never)

    expect(await getLogoFromBrapi('ZZZZ9')).toBeNull()
    expect(mockedAxios.head).toHaveBeenCalledTimes(2)
  })

  it('retorna null e nao quebra quando a requisicao falha', async () => {
    mockedAxios.head.mockRejectedValue(new Error('network error'))

    expect(await getLogoFromBrapi('PRIO3')).toBeNull()
  })
})

describe('imgScrapeBing', () => {
  it('extrai a primeira imagem utilizavel do html', async () => {
    const html = `<a class="iusc" m="{&quot;murl&quot;:&quot;https://cdn.exemplo.com/logo.png&quot;}"></a>`
    mockedAxios.get.mockResolvedValueOnce({ data: html } as never)

    const url = await imgScrapeBing('ABCB4')

    expect(url).toBe('https://cdn.exemplo.com/logo.png')
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('https://www.bing.com/images/search?q='),
      expect.objectContaining({ timeout: 15000 }),
    )
  })

  it('ignora urls sem extensao de imagem', async () => {
    const html = `<a class="iusc" m="{&quot;murl&quot;:&quot;https://exemplo.com/pagina&quot;}"></a>`
    mockedAxios.get.mockResolvedValueOnce({ data: html } as never)

    expect(await imgScrapeBing('ABCB4')).toBeNull()
  })

  it('retorna null quando a busca falha', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('timeout'))

    expect(await imgScrapeBing('ABCB4')).toBeNull()
  })
})
