//
//  Pysäkkibot-2.0
//

const TeleBot = require('telebot');

//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser', 'floodProtection'],
    pluginConfig: {
        floodProtection: {
            interval: 0.8,
            message: 'Ota iisisti ja relaa 😤'
        }
    }
});

module.exports = bot