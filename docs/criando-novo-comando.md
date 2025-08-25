# Como Criar um Novo Comando no Bot Discord

Este documento explica o processo completo para criar um novo comando no bot Discord.

## Estrutura de Arquivos

O sistema de comandos está organizado da seguinte forma:

```
src/
├── commands/
│   ├── index.js              # Sistema principal de comandos
│   ├── comandos-struct.js    # Estrutura de dados dos comandos
│   └── lista-comandos.js     # Registro de todos os comandos
├── handlers/                 # Handlers dos comandos organizados por categoria
│   ├── index.js             # Exporta todos os handlers
│   ├── guard-handler.js     # Sistema de permissões
│   └── [categoria]/
│       └── [nome-comando].js
```

## Passo a Passo

### 1. Criar o Handler

Primeiro, crie o arquivo do handler na pasta apropriada dentro de `src/handlers/`:

```javascript
// src/handlers/[categoria]/[nome-comando].js

const { requireAdmin } = require('../guard-handler')

async function handle(message) {
  // Lógica do comando aqui
  message.reply('Resposta do comando')
}

// Para comandos que precisam de argumentos:
async function handleWithArgs(args, message) {
  // Lógica do comando com argumentos
  const [arg1, arg2] = args
  message.reply(`Argumentos: ${arg1}, ${arg2}`)
}

// Exportação padrão
module.exports = message => handle(message)

// Para comandos com argumentos:
module.exports = (args, message) => handleWithArgs(args, message)

// Para comandos que precisam de permissão de admin:
module.exports = message => requireAdmin(message, handle)
```

### 2. Adicionar o Handler ao Index

Adicione o import e export no arquivo `src/handlers/index.js`:

```javascript
// Adicionar o import
const meuComandoHandler = require('./[categoria]/[nome-comando]')

// Adicionar ao module.exports
module.exports = {
  // ... outros handlers
  meuComandoHandler
}
```

### 3. Registrar o Comando

No arquivo `src/commands/lista-comandos.js`:

```javascript
// Adicionar o import
const {
  // ... outros handlers
  meuComandoHandler
} = require('../handlers')

// Registrar o comando
registrarComando('comando', meuComandoHandler, 'Descrição do comando')
registrarComando('comando', meuComandoHandler, 'Descrição do comando :: args @arg1 @arg2', true)
```

### 4. Sistema de Permissões

Para comandos que só podem ser executados por administradores:

```javascript
const { requireAdmin } = require('../guard-handler')

async function handle(message) {
  // Lógica do comando
}

module.exports = message => requireAdmin(message, handle)
```

O sistema verifica se o usuário é `jeanlucafp` (definido em `src/utils/discord-nicks-default.js`).

### 5. Comandos com Argumentos

Para comandos que precisam de argumentos:

```javascript
async function handle(args, message) {
  if (!args.length) {
    return message.reply('Informe os argumentos necessários')
  }
  
  const [arg1, arg2] = args
  // Lógica do comando
}

module.exports = (args, message) => handle(args, message)
```

## Exemplo Prático

Vamos criar um comando `!teste` que responde "Olá mundo":

### 1. Criar o handler

```javascript
// src/handlers/teste/teste.js
async function handle(message) {
  message.reply('Olá mundo!')
}

module.exports = message => handle(message)
```

### 2. Adicionar ao index

```javascript
// src/handlers/index.js
const testeHandler = require('./teste/teste')

module.exports = {
  // ... outros handlers
  testeHandler
}
```

### 3. Registrar o comando

```javascript
// src/commands/lista-comandos.js
const {
  // ... outros handlers
  testeHandler
} = require('../handlers')

registrarComando('teste', testeHandler, 'Comando de teste que responde olá mundo')
```

## Convenções

1. **Nomes de arquivos**: Use kebab-case para nomes de arquivos
2. **Nomes de comandos**: Use kebab-case para nomes de comandos
3. **Organização**: Agrupe handlers relacionados na mesma pasta
4. **Permissões**: Use `requireAdmin` para comandos sensíveis
5. **Documentação**: Sempre documente o comando na descrição

## Estrutura de Comandos Existentes

- `agiotagem/`: Comandos relacionados a dívidas e finanças
- `b3/`: Comandos relacionados a investimentos e arbitragem
- `ia/`: Comandos de inteligência artificial
- `music/`: Comandos de música
- `record/`: Comandos de gravação de áudio
- `web3/`: Comandos relacionados a blockchain

## Testando

Após criar o comando, reinicie o bot e teste usando:

```
!help
```

Para ver se o comando aparece na lista, e depois teste o comando diretamente.
