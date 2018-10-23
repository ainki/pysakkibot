// admin.js

const bot = require('../../bot')

var hetki = "Hetkinen..."

module.exports = {
    admin: function (chatId) {
        if (chatId == 81023943 || chatId == 86734737) {
            console.log("[info] Admin tunnistettu")
            let replyMarkup = bot.keyboard([
                ['/adminhairio'],
            ], { resize: true });
            return bot.sendMessage(chatId, `Admin menu:`, { replyMarkup })
        } else {
            console.log("[info] Adminia ei tunnistettu")
        }
    },
    adminhairio: function (chatId) {
        //Häiriön lisääminen
        //Jos viesti vain vain admineilta
        if (chatId == 81023943 || chatId == 86734737) {
            console.log("alussa: "+hetki)
            console.log("[info] Admin tunnistettu")
            //Jos hetki on Hetkinen... - lisää häiriön
            if (hetki == "Hetkinen...") {
                //Vaihtaa muuttijien viestin
                hetki = "Hetkinen...\nHäiriö voi hidastaa hakua."
                hetki2 = "Haetaan aikatauluja...\nHäiriö voi hidastaa hakua."
                //Lähettää admineille viestin
                bot.sendMessage(81023943, `[admin] Häiriö lisätty.`);
                bot.sendMessage(86734737, `[admin] Häiriö lisätty.`);
                console.log("Logaus: " + hetki)
                return console.log("[info] Admin - Häiriö viesti lisätty!")
            } else {
                //Vaihtaa muuttijien viestin
                hetki = "Hetkinen..."
                hetki2 = "Haetaan aikatauluja..."
                //Lähettää admineille viestin
                bot.sendMessage(81023943, `Häiriö poistettu.`);
                bot.sendMessage(86734737, `Häiriö poistettu.`);
                return console.log("[info] Admin - Häiriö viesti poistettu!")
            }
        } else {
            console.log("[info] Adminia ei tunnistettu")
        }
    },
    hetkinen: hetki
}

