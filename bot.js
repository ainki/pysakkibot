//
//  Pysäkkibot-2.0
//
// Do not commit this file with a token or without any changes!

//NPM
const TeleBot = require('telebot');

//Heroku token
// var token = process.env.token;
 var token = '535551085:AAE6CMwO1LKM9PbjnEyPzxxiit8JoKRk-ok'  // Lokaaliin pyörittämiseen

//BotToken
const bot = new TeleBot({
    token: token,
    usePlugins: ['askUser', 'floodProtection', 'namedButtons'],
    pluginConfig: {
        floodProtection: {
            interval: 0.5,
            message: 'Ota iisisti ja relaa 😤'
        }
    }
});

module.exports = bot;
