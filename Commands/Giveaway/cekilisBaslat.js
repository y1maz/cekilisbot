const { ActionRowBuilder, ButtonBuilder, EmbedBuilder, SlashCommandBuilder, PermissionFlagsBits, ButtonStyle, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilisbaslat')
        .setDescription('Çekiliş başlatır')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('odul')
                .setDescription('Çekiliş ödülü')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('sure')
                .setDescription('Çekiliş süresi (saniye cinsinden)')
                .setRequired(true))
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Çekiliş mesajının gönderileceği kanal')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)),

    async execute(interaction) {
        const odul = interaction.options.getString('odul');
        const sure = interaction.options.getInteger('sure');
        const kanal = interaction.options.getChannel('kanal');

        const endDate = new Date(Date.now() + (sure * 1000));
        const formattedEndDate = endDate.toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

        const cekilisEmbed = new EmbedBuilder()
            .setTitle('Çekiliş başladı!')
            .setDescription(`
                - Ödül: **${odul}**\n - Katılmak için aşağıdaki "🎊" butonuna tıklayınız.
                `)
            .addFields(
                { name: ' - Bitiş tarihi', value: `\`\`\`${formattedEndDate}\`\`\``, inline: true }
            )
            .setColor('Aqua')
            .setTimestamp();

        const row = new ActionRowBuilder().setComponents(
            new ButtonBuilder().setCustomId('cekilise_katil').setLabel('Çekilişe katıl').setStyle(ButtonStyle.Success).setEmoji('🎊')
        );

        // Belirlenen kanalda çekiliş mesajını gönder
        const cekilisMesaji = await kanal.send({ embeds: [cekilisEmbed], components: [row] });

        await interaction.reply({content: 'Çekiliş başarıyla oluşturuldu.', ephemeral: true});

        const cekilisData = {
            messageId: cekilisMesaji.id,
            channelId: cekilisMesaji.channel.id,
            odul,
            endDate: endDate.toISOString(),
            participants: [],
            status: 'active' // Çekilişin aktif olduğunu işaretler
        };

        const cekilisFile = path.join(__dirname, '../../Data/cekilis.json');
        fs.writeFileSync(cekilisFile, JSON.stringify(cekilisData, null, 2));

        // Çekilişi bitirme işlemi
        setTimeout(async () => {
            const updatedCekilisData = JSON.parse(fs.readFileSync(cekilisFile, 'utf-8'));

            if (updatedCekilisData.status !== 'active') {
                return; // Eğer çekiliş zaten bitmişse işlem yapma
            }

            const participants = updatedCekilisData.participants;
            if (participants.length === 0) {
                await cekilisMesaji.edit({ content: 'Çekilişe kimse katılmadı.', embeds: [], components: [] });
                
                // Çekilişi bitmiş olarak işaretle
                updatedCekilisData.status = 'closed';
                fs.writeFileSync(cekilisFile, JSON.stringify(updatedCekilisData, null, 2));
                
                // Çekiliş logunu ekle
                const logEntry = {
                    type: 'end',
                    messageId: updatedCekilisData.messageId,
                    channelId: updatedCekilisData.channelId,
                    odul: updatedCekilisData.odul,
                    winnerId: null,
                    timestamp: new Date().toISOString()
                };

                const logFile = path.join(__dirname, '../../Data/cekilis_log.json');
                if (fs.existsSync(logFile)) {
                    const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
                    logs.push(logEntry);
                    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
                } else {
                    fs.writeFileSync(logFile, JSON.stringify([logEntry], null, 2));
                }
                
                return;
            }

            const winnerId = participants[Math.floor(Math.random() * participants.length)];
            const winner = await interaction.guild.members.fetch(winnerId);

            const winnerEmbed = new EmbedBuilder()
                .setTitle('Çekiliş Sonuçları')
                .setDescription('Kazanan belirlendi.')
                .addFields(
                    { name: ' - Kazanan', value: `\`\`\`${winner.user.username}\`\`\``, inline: true },
                    { name: ' - Ödül', value: `\`\`\`${odul}\`\`\``, inline: true }
                )
                .setColor('Green')
                .setTimestamp();

            await cekilisMesaji.edit({
                content: `${winner}`,
                embeds: [winnerEmbed],
                components: [],
                allowedMentions: { users: [winnerId] },
            });

            // Çekilişi bitmiş olarak işaretle
            updatedCekilisData.status = 'closed';
            updatedCekilisData.winnerId = winnerId;
            fs.writeFileSync(cekilisFile, JSON.stringify(updatedCekilisData, null, 2));

            // Çekiliş logunu ekle
            const logEntry = {
                type: 'end',
                messageId: updatedCekilisData.messageId,
                channelId: updatedCekilisData.channelId,
                odul: updatedCekilisData.odul,
                winnerId: winnerId,
                timestamp: new Date().toISOString()
            };

            const logFile = path.join(__dirname, '../../Data/cekilis_log.json');
            if (fs.existsSync(logFile)) {
                const logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
                logs.push(logEntry);
                fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
            } else {
                fs.writeFileSync(logFile, JSON.stringify([logEntry], null, 2));
            }
        }, sure * 1000);
    },
};