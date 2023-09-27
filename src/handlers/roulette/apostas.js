const { MessageActionRow, MessageSelectMenu } = require('discord.js');

function addNumberOptions(start, end) {
    const options = [];
    for (let i = start; i <= end; i++) {
        options.push({ label: i.toString(), value: i.toString() });
    }
    return options;
}

// Array de Select Menus representando as opções de aposta na mesa de roleta
const roletaOptions = [
    // Apostas em números individuais
    new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('aposta_numero_0_18')
            .setPlaceholder('Escolha números entre os números 0 e 18...')
            .setMaxValues(19)
            .addOptions(addNumberOptions(0, 18))
    ),

    // Apostas em números individuais
    new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('aposta_numero_19_36')
            .setPlaceholder('Escolha números entre os numero 19 e 36...')
            .setMaxValues(18)
            .addOptions(addNumberOptions(19, 36))
    ),

    // Apostas em cores (vermelho ou preto)
    new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('aposta_cor')
            .setPlaceholder('Escolha uma cor ou  ímpar/par...')
            .setMaxValues(2)
            .addOptions([
                { label: 'Vermelho', value: 'vermelho' },
                { label: 'Preto', value: 'preto' },
                { label: 'Ímpar', value: 'impar' },
                { label: 'Par', value: 'par' }
            ])
    ),

    // Apostas em dúzias
    new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('aposta_duzia')
            .setPlaceholder('Escolha uma dúzia...')
            .setMaxValues(3)
            .addOptions([
                { label: 'Primeira Dúzia (1-12)', value: 'duzia_1' },
                { label: 'Segunda Dúzia (13-24)', value: 'duzia_2' },
                { label: 'Terceira Dúzia (25-36)', value: 'duzia_3' },
            ])
    ),

    // Apostas em colunas
    new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('aposta_coluna')
            .setPlaceholder('Escolha uma coluna...')
            .setMaxValues(3)
            .addOptions([
                { label: 'Coluna 1', value: 'coluna_1' },
                { label: 'Coluna 2', value: 'coluna_2' },
                { label: 'Coluna 3', value: 'coluna_3' },
            ])
    )
];

module.exports = { roletaOptions }