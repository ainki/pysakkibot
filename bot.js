//
//  Pysäkkibot-2.0
//  Made by ainki
//

//NPM
const TeleBot = require('telebot');

//BotToken
const bot = new TeleBot({
    token: 'TOKEN',
    usePlugins: ['askUser', 'floodProtection'],
    pluginConfig: {
        floodProtection: {
            interval: 0.7,
            message: 'Ota iisisti ja relaa 😤'
        }
    }
});

module.exports = bot;