# Arquitetura do Bot Telegram

## Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                    Mensagem Recebida                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │   index.js (Router)   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ Chat Type: Private?   │
              └──────────┬───────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
         ▼ SIM                           ▼ NÃO
┌─────────────────┐              ┌─────────────────┐
│ Verifica Chat ID │              │ Ignora/Continua │
└────────┬─────────┘              └─────────────────┘
         │
         ▼
┌────────────────────────────────┐
│ Chat ID == AUTHORIZED_CHAT_ID? │
└────────┬───────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼ SIM     ▼ NÃO
┌───────┐  ┌──────────┐
│  AUTH │  │  PUBLIC  │
│  BOT  │  │   BOT    │
└───┬───┘  └────┬─────┘
    │           │
    │           ▼
    │    ┌───────────────────────────┐
    │    │ public-handler.js         │
    │    │ - Salva no MongoDB        │
    │    │ - Notifica admin (1ª vez) │
    │    │ - Responde com Chat ID    │
    │    │ - Incrementa contador     │
    │    └───────────────────────────┘
    │
    ▼
┌───────────────────────────────────┐
│      Handler Autorizado           │
├───────────────────────────────────┤
│                                   │
│  ┌─────────────────────────────┐ │
│  │ daily-budget-handler.js     │ │
│  │ - My Daily budget           │ │
│  │ - spent money               │ │
│  │ - batch                     │ │
│  │ - Info/Links                │ │
│  └─────────────────────────────┘ │
│                                   │
└───────────────────────────────────┘
```

## Módulos e Responsabilidades

### 1. `index.js` (Router Principal)
**Responsabilidade:** Roteamento inteligente de mensagens

- Cria duas instâncias de bot: `authorizedBot` e `publicBot`
- Middleware de roteamento que direciona para bot correto
- Gerencia o ciclo de vida do bot principal

**Fluxo:**
1. Recebe mensagem
2. Verifica se é chat privado
3. Identifica chat_id do remetente
4. Roteia para `authorizedBot` ou `publicBot`

### 2. `config/telegram-config.js`
**Responsabilidade:** Configurações centralizadas

- `TELEGRAM_API_KEY`: Token do bot
- `AUTHORIZED_CHAT_ID`: ID do usuário autorizado (512142034)
- `KEYBOARDS`: Definições de teclados customizados

### 3. `utils/telegram-utils.js`
**Responsabilidade:** Funções utilitárias compartilhadas

- `enviarMensagemParaMim()`: Notifica administrador
- `enviarMensagemHTML()`: Envia mensagens formatadas
- `isAuthorizedUser()`: Valida autorização
- `telegram`: Instância do Telegram API

### 4. `handlers/daily-budget-handler.js`
**Responsabilidade:** Gestão de orçamento diário (Usuário Autorizado)

**Features:**
- Consultar orçamento atual
- Registrar gastos individuais
- Registrar gastos em lote (batch)
- Exibir informações e links

**Comandos:**
- `/start` - Inicializa bot com teclado
- `My Daily budget` - Exibe orçamento atual
- `spent money` - Registra gasto (formato: valor,descrição)
- `batch` - Modo batch para múltiplos gastos
- `Info/Links/Link` - Informações úteis

**Estado:**
- `awaitResponseSpentMoney`: Aguardando entrada de gasto
- `batchResponse`: Modo batch ativo
- `batchInserts`: Array de gastos em lote

### 5. `handlers/public-handler.js`
**Responsabilidade:** Gerenciar usuários não autorizados e validar assinaturas

**Comportamento por Estado:**

**Estado INITIAL (Primeira Mensagem):**
- Salva usuário no MongoDB
- Notifica admin
- Solicita email de cadastro
- Muda estado para WAITING_EMAIL

**Estado WAITING_EMAIL:**
- Valida formato do email
- Busca assinatura na API do Keycloak
- Se encontrada:
  - Salva email e vigência no MongoDB
  - Exibe status da assinatura
  - Calcula dias restantes
  - Muda estado para COMPLETED
- Se não encontrada:
  - Informa que não há assinatura
  - Mantém no estado WAITING_EMAIL para retry

**Estado COMPLETED:**
- Exibe informações da assinatura
- Mostra status (ativa/expirada)
- Dias restantes ou mensagem de expiração

**Sistema de Cache:**
- Cache em memória usando `Map` nativo
- **Cache Hit:** Evita consulta ao MongoDB
- **Cache Miss:** Busca no MongoDB e adiciona ao cache
- Funções exportadas: `getUserFromCache()`

**Integração com Services:**
- **SubscriptionService:** `getSubscriptionByEmail(email)` busca assinatura na API Keycloak
- **MongoDB:** Collection `telegram-users`
- **Keycloak:** Busca de assinaturas via API OAuth

**Dados salvos no MongoDB:**
- `userId`: Chat ID do Telegram
- `userName`: Nome do usuário
- `username`: Username do Telegram
- `firstInteraction`: Data da primeira interação
- `email`: Email da assinatura (null até preenchimento)
- `vigenteAte`: Data de vigência da assinatura
- `isActive`: Boolean indicando se assinatura está ativa
- `lastUpdate`: Data da última atualização

**Fluxo Completo:**
```javascript
1. Primeira mensagem:
   - Salva usuário no MongoDB (sem email)
   - Notifica admin
   - Estado → WAITING_EMAIL
   - Responde: "Envie seu email"

2. Usuário envia email:
   - Valida formato do email
   - Busca assinatura no Keycloak
   - Se encontrada:
     * Salva email + vigenteAte no MongoDB
     * Calcula dias restantes
     * Exibe status da assinatura
     * Estado → COMPLETED
   - Se não encontrada:
     * Informa erro
     * Mantém estado WAITING_EMAIL

3. Mensagens subsequentes:
   - Se já tem email cadastrado:
     * Exibe informações da assinatura
     * Status atualizado (ativa/expirada/expirando)
```

### 6. `handlers/index.js`
**Responsabilidade:** Exportação centralizada de handlers

Facilita imports com uma única linha:
```javascript
const { registerDailyBudgetHandlers, registerPublicHandlers } = require('./handlers')
```

## Fluxo de Dados

### Daily Budget - Spent Money

```
Usuário envia "spent money"
    ↓
state.awaitResponseSpentMoney = true
    ↓
Usuário envia "100,café"
    ↓
Parse: money = "100", description = "café"
    ↓
myDailyBudgetService.spentMoney({ money, description })
    ↓
Retorna novo budget
    ↓
state.awaitResponseSpentMoney = false
```

### Daily Budget - Batch

```
Usuário envia "batch"
    ↓
state.awaitResponseSpentMoney = true
state.batchResponse = true
    ↓
Loop: Usuário envia "valor,descricao"
    ↓
Adiciona em state.batchInserts[]
    ↓
Usuário envia "fim"
    ↓
myDailyBudgetService.batchInsert(state.batchInserts)
    ↓
Mostra resumo e novo budget
    ↓
Limpa estados
```

### Public Handler - Fluxo de Validação de Assinatura

```
┌────────────────────────────────────────────────┐
│ Usuário envia primeira mensagem               │
└───────────────────┬────────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │ Usuário já tem email? │
        └───────┬───────────────┘
                │
    ┌───────────┴───────────┐
    │ SIM                   │ NÃO
    ↓                       ↓
┌──────────────┐   ┌─────────────────────┐
│ Exibe status │   │ Estado: INITIAL     │
│ da assinatura│   │ - Salva no MongoDB  │
│ - Email      │   │ - Notifica admin    │
│ - Vigência   │   │ - Solicita email    │
│ - Dias rest. │   │ - Estado→WAITING    │
└──────────────┘   └──────────┬──────────┘
                               ↓
                    ┌────────────────────┐
                    │ Usuário envia email│
                    └──────────┬─────────┘
                               ↓
                    ┌──────────────────┐
                    │ Valida email     │
                    └──────┬───────────┘
                           │
                    ┌──────┴───────┐
                    │ Válido?      │
                    └──┬───────┬───┘
                  SIM  │       │  NÃO
                       ↓       ↓
          ┌─────────────┐  ┌──────────┐
          │ Busca API   │  │ Tenta    │
          │ Keycloak    │  │ novamente│
          └──────┬──────┘  └──────────┘
                 │
          ┌──────┴────────┐
          │ Encontrou?    │
          └──┬─────────┬──┘
        SIM  │         │  NÃO
             ↓         ↓
    ┌────────────┐  ┌──────────┐
    │ Salva DB:  │  │ Informa  │
    │ - email    │  │ erro     │
    │ - vigência │  │ - Retry  │
    │ Exibe:     │  └──────────┘
    │ - Status   │
    │ - Dias     │
    │ Estado→    │
    │ COMPLETED  │
    └────────────┘
```

## Estrutura de Dados MongoDB

### Collection: `telegram-users`

```javascript
{
  _id: ObjectId,
  userId: 123456789,              // Chat ID do Telegram
  userName: "João Silva",         // Primeiro nome
  username: "joaosilva",          // @username
  firstInteraction: ISODate,      // Primeira mensagem
  email: "joao@example.com",      // Email da assinatura (null inicialmente)
  vigenteAte: ISODate,            // Data de vigência da assinatura
  isActive: true,                 // Status da assinatura (ativa/inativa)
  lastUpdate: ISODate             // Última atualização dos dados
}
```

### Operações:

**Inserção (novo usuário - sem email):**
```javascript
{
  userId: ctx.from.id,
  userName: ctx.from.first_name,
  username: ctx.from.username,
  firstInteraction: new Date(),
  email: null,
  vigenteAte: null,
  isActive: false
}
```

**Atualização (vinculação de assinatura):**
```javascript
updateOne(
  { userId },
  { 
    $set: { 
      email: "usuario@example.com",
      vigenteAte: new Date("2025-12-31"),
      isActive: true,
      lastUpdate: new Date()
    }
  }
)
```

**Validação de Email:**
- Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Busca case-insensitive na API Keycloak
- Retorna: `{ found, email, vigenteAte, isActive }`

## Performance e Otimização

### Sistema de Cache em Memória
- **Estrutura:** Map nativo do JavaScript
- **Objetivo:** Reduzir consultas ao MongoDB
- **Cache Hit:** Acesso O(1) sem query ao banco
- **Cache Miss:** Primeira vez busca no MongoDB e popula cache

**Vantagens:**
- Redução de latência (1-5ms vs 100-500ms)
- Menor carga no MongoDB
- Escalabilidade melhorada

**API do Cache:**
```javascript
getUserFromCache() // Busca usuário específico
```

Ver documentação completa em: [CACHE.md](./CACHE.md)

## Segurança

### Controle de Acesso
1. **Middleware de Autorização:** Verifica chat_id antes de processar
2. **Isolamento de Bots:** Usuários autorizados e públicos em instâncias separadas
3. **Notificações:** Admin é notificado de tentativas não autorizadas (apenas 1ª vez)
4. **Validação:** Todas as entradas são validadas antes de processar
5. **Persistência:** Registro de todas as interações não autorizadas

### Boas Práticas Implementadas
- Separação de concerns (responsabilidades)
- Configuração centralizada
- Estado isolado por feature
- Error handling em operações críticas
- Logs de tentativas de acesso não autorizado
- Rastreamento de usuários com MongoDB
- Cache em memória para otimização de performance

## Expansibilidade

### Adicionar Nova Feature para Usuário Autorizado

1. Crie handler: `handlers/nova-feature-handler.js`
2. Implemente função `registerNovaFeatureHandlers(bot)`
3. Exporte em `handlers/index.js`
4. Registre em `index.js`: `registerNovaFeatureHandlers(authorizedBot)`

### Adicionar Nova Feature Pública

1. Edite `handlers/public-handler.js`
2. Adicione novos comandos e lógica
3. Features públicas automaticamente disponíveis para todos
4. Utilize `saveUserToDatabase()` para rastrear interações

### Modificar Configurações

1. Edite `config/telegram-config.js`
2. Adicione novas constantes ou configurações
3. Exporte no `module.exports`
4. Importe onde necessário

## Consultas MongoDB Úteis

### Ver todos os usuários cadastrados
```javascript
db.getCollection('telegram-users').find({})
```

### Usuários ordenados por data de cadastro
```javascript
db.getCollection('telegram-users').find({}).sort({ firstInteraction: -1 })
```

### Usuários mais ativos
```javascript
db.getCollection('telegram-users').find({}).sort({ messageCount: -1 })
```

### Contar total de usuários
```javascript
db.getCollection('telegram-users').countDocuments()
```

### Últimas interações
```javascript
db.getCollection('telegram-users').find({}).sort({ lastInteraction: -1 }).limit(10)
```

## Testes Recomendados

### Testes Unitários
- Validação de funções utilitárias
- Parse de comandos
- Lógica de negócio isolada
- Função `saveUserToDatabase()`

### Testes de Integração
- Fluxo completo de spent money
- Fluxo completo de batch
- Roteamento de mensagens
- Autorização de usuários
- Salvamento no MongoDB
- Atualização de usuários existentes

### Testes E2E
- Enviar mensagens de usuário autorizado
- Enviar mensagens de usuário não autorizado
- Testar todos os comandos disponíveis
- Verificar notificações ao admin
- Validar persistência no MongoDB

## Status Atual

| Componente | Status | Descrição |
|------------|--------|-----------|
| **Router (index.js)** | ✅ Completo | Roteamento entre authorized e public |
| **Daily Budget Handler** | ✅ Completo | Funcionalidade preservada |
| **Public Handler** | ✅ Completo | State machine + Validação de assinatura |
| **Config** | ✅ Completo | AUTHORIZED_CHAT_ID configurado |
| **Utils** | ✅ Completo | Funções compartilhadas |
| **MongoDB Integration** | ✅ Completo | Collection telegram-users com email/vigência |
| **Cache System** | ✅ Completo | Map em memória com API |
| **Keycloak Integration** | ✅ Completo | Busca de assinaturas por email |
| **State Machine** | ✅ Completo | INITIAL → WAITING_EMAIL → COMPLETED |
| **Documentação** | ✅ Completo | Arquitetura completa documentada |

## Resumo da Arquitetura

### Handlers Ativos:
1. **daily-budget-handler.js** - Gestão de orçamento (autorizado)
2. **public-handler.js** - Validação de assinaturas (público)

### Fluxo Simplificado:
```
Mensagem → Router → isAuthorizedUser()?
                    ├─ SIM → Daily Budget Handler
                    └─ NÃO → Public Handler → State Machine
                                           ├─ INITIAL: Solicita email
                                           ├─ WAITING_EMAIL: Valida + Busca API
                                           └─ COMPLETED: Exibe status
```

### Estados do Public Handler:
1. **INITIAL:** Primeira interação, solicita email
2. **WAITING_EMAIL:** Aguardando email, valida e busca assinatura
3. **COMPLETED:** Email vinculado, exibe informações

### Características:
- ✅ Modular e escalável
- ✅ Seguro e isolado
- ✅ Rastreamento completo
- ✅ Notificações inteligentes
- ✅ Persistência de dados
- ✅ Validação de assinaturas
- ✅ Integração com Keycloak
- ✅ State machine para controle de fluxo
- ✅ Fácil manutenção
