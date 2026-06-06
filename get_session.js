require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession }  = require("telegram/sessions");
const input = require("input");

const apiId   = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;

(async () => {
    const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
        connectionRetries: 5,
    });

    await client.start({
        phoneNumber: async () => await input.text("📱 Рақами телефон (+992...): "),
        phoneCode:   async () => await input.text("🔑 Коди SMS: "),
        password:    async () => await input.text("🔒 Пароли 2FA (агар бошад): "),
        onError:     (e) => console.log("Хатогӣ:", e),
    });

    console.log("\n✅ Сессияи нав:\n");
    console.log(client.session.save());
    console.log("\n👆 Инро дар .env файл ба SESSION_STRING гузоред!\n");

    await client.disconnect();
})();