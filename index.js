require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu3sVC2Oe3KcUaCbYlbhQ+jyOrLb07B92xlpYg7cFjUTK50IHswZ698p72KIrnhjoiLSGQrFgbkUqKfLBLddwefQDs5hO3QqiX8vwP/bjyRd18rjGFZSLl46XmfbDEdKPptlrLjCnhdn5yogsFDhg3YvheNEVcDuRls6NH4xe/TkkzW8YumJF7j1xFkjLakYoE0xpjyasPRpDLerR5amjKPlUSn9xcl6jlXkHFZlp8/7McUt3a4z8RZ5DcUHbO7mContQAM474/zmhXzTrJYpJyyPRUNL7TyewHzMnpdpF1D9p7LM9QNKu+GU6NJpCwm1C2GDlM+Ci8zKL+UlqYl37HY=");

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

    await client.start({
        phoneNumber: async () => "",
        phoneCode: async () => "",
        onError: (err) => console.log(err),
    });

    console.log("✅ Бот фаъол аст! Паёмҳоро гӯш мекунам...");

    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.isPrivate || message.out) return;

        try {
            const sender = await message.getSender();
            const name = sender?.firstName || "Дӯстам";

            const replyText = `Салом, ${name} 👋\n\nМан боти Муҳсиддин ҳастам 🤖\nва ҳоло Муҳсиддин онлайн нест 🪫\n\nвақте онлайн шуд ба шумо ҳатман ҷавоб медиҳад 🍻`;

            await client.sendMessage(message.chatId, {
                message: replyText,
                replyTo: message.id
            });
            console.log(`📨 Ба ${name} ҷавоб фиристода шуд.`);
        } catch (err) {
            console.log("Хатогӣ:", err.message);
        }
    }, new NewMessage({ incoming: true }));
})();

