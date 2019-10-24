// reitti.js

const bot = require('../../bot')
const { request } = require('graphql-request')
var jp = require('jsonpath');
var muuttujia = require('../flow/muutujia');
const chunkArray = require('./chunkArray')

function reitti(chatId, viesti) {
    if (viesti === '/reitti') {
        console.info(' Kysytään lähtöpaikkaa.');
        return bot.sendMessage(chatId, 'Anna lähtöpaikka', { replyMarkup: 'hide', ask: 'lahtopaikka' });
    } else {
        bot.sendAction(chatId, 'typing');
        console.info('Käsitellään reittiä...');
        //Poistaa "/reitti " tekstin
        viesti = viesti.replace('/reitti ', '')
        //Kutuu xx funktion
        // return aaa(chatId, viesti);
    }
}

//Exporttaa tän indexiin
module.exports = reitti;

// Kysyy lähtöpaikan ja määränpään

bot.on('ask.lahtopaikka', msg => {
    if (!msg.text.includes("/")) {
        msg.text
        console.info(' Kysytään määränpäätä.');
        return bot.sendMessage(msg.from.id, 'Anna määränpää', { replyMarkup: 'hide', ask: 'maaranpaa' });
    }
});

bot.on('ask.maaranpaa', msg => {
    if (!msg.text.includes("/")) {
        msg.text
        console.info('Käsitellään reittiä...');
        // Kutsuu xx funtion
        // return aaa(msg.from.id);
    }
});