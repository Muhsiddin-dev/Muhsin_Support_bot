// ═══════════════════════════════════════════════════════
//  index.js — нуқтаи оғоз
// ═══════════════════════════════════════════════════════
require('dotenv').config();

const { client, invoke }  = require("./telegram");
const { NewMessage }      = require("telegram/events");
const { onOutgoing, onIncoming } = require("./handlers");
const { buildMainMenu }   = require("./menu");
const { menuState }       = require("./state");
const { Api }             = require("telegram");

(async () => {
    await client.connect();
    const me = await client.getMe();
    console.log(`\n✅ Пайваст: @${me.username || me.firstName}`);
    console.log(`📋 /menu — менюро кушоед\n`);

    // Паёмҳои фиристодашуда (командаҳо + хомӯшӣ)
    client.addEventHandler(
        event => onOutgoing(event.message),
        new NewMessage({ outgoing: true })
    );

    // Паёмҳои воридшаванда (автоҷавоб)
    client.addEventHandler(
        event => onIncoming(event.message),
        new NewMessage({ incoming: true })
    );

    console.log("🚀 Userbot фаъол аст!\n");
})();
