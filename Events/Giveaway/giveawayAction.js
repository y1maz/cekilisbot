const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (interaction.isButton()) {
            if (interaction.customId === 'cekilise_katil') {
                const cekilisFile = path.join(__dirname, '../../Data/cekilis.json');

                if (!fs.existsSync(cekilisFile)) {
                    return await interaction.reply({ content: 'Aktif bir çekiliş bulunamadı.', ephemeral: true });
                }

                const cekilisData = JSON.parse(fs.readFileSync(cekilisFile, 'utf-8'));

                if (interaction.replied || interaction.deferred) {
                    return;
                }

                try {
                    const accountCreationDate = interaction.user.createdAt;
                    const currentDate = new Date();
                    const accountAgeInDays = Math.floor((currentDate - accountCreationDate) / (1000 * 60 * 60 * 24));

                    if (accountAgeInDays < 30) {
                        await interaction.reply({ content: 'Hesabınız 1 aydan eski olmalıdır.', ephemeral: true });
                        return;
                    }

                    if (!cekilisData.participants.includes(interaction.user.id)) {
                        cekilisData.participants.push(interaction.user.id);
                        fs.writeFileSync(cekilisFile, JSON.stringify(cekilisData, null, 2));
                        
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle('Çekiliş başladı!')
                            .setDescription(`
                                 -  Ödül **${cekilisData.odul}**
                                 -  Katılmak için aşağıdaki "🎊" butonuna tıklayınız.
                                `)
                            .addFields(
                                { name: ' -   Bitiş tarihi', value: `\`\`\`${new Date(cekilisData.endDate).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}\`\`\``, inline: true },
                                { name: ' -   Katılımcılar', value: `\`\`\`${cekilisData.participants.length} kişi katıldı\`\`\``, inline: true }
                            )
                            .setColor('Aqua')
                            .setTimestamp();

                        const channel = await interaction.client.channels.fetch(cekilisData.channelId);
                        const message = await channel.messages.fetch(cekilisData.messageId);
                        await message.edit({ embeds: [updatedEmbed] });

                        await interaction.reply({ content: 'Çekilişe katıldınız!', ephemeral: true });
                    } else {
                        await interaction.reply({ content: 'Zaten çekilişe katıldınız.', ephemeral: true });
                    }
                } catch (error) {
                    console.error('Etkileşim işlenirken hata oluştu:', error);
                    if (!interaction.replied) {
                        try {
                            await interaction.reply({ content: 'Bir hata oluştu. Lütfen tekrar deneyin.', ephemeral: true });
                        } catch (replyError) {
                            console.error('Hata mesajı gönderilirken hata oluştu:', replyError);
                        }
                    }
                }
            }
        } 
    },
};
