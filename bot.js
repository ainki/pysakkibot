//
//  Pysäkkibot-2.0
//
// Do not commit this file with a token or without any changes!

//NPM
const TeleBot = require('telebot');
require('dotenv').config();

//Heroku token
const token = process.env.token;

//BotToken
const bot = new TeleBot({
    token: token,
    usePlugins: ['askUser', 'floodProtection', 'namedButtons'],
    pluginConfig: {
        floodProtection: {
            interval: 0.3,
            message: 'Ota iisisti ja relaa 😤'
        }
    }
});

module.exports = bot;
