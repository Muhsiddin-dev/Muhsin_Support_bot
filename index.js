require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu3sVC2Oe3KcUaCbYlbhQ+jyOrLb07B92xlpYg7cFjUTK50IHswZ698p72KIrnhjoiLSGQrFgbkUqKfLBLddwefQDs5hO3QqiX8vwP/bjyRd18rjGFZSLl46XmfbDEdKPptlrLjCnhdn5yogsFDhg3YvheNEVcDuRls6NH4xe/TkkzW8YumJF7j1xFkjLakYoE0xpjyasPRpDLerR5amjKPlUSn9xcl6jlXkHFZlp8/7McUt3a4z8RZ5DcUHbO7mContQAM474/zmhXzTrJYpJyyPRUNL7TyewHzMnpdpF1D9p7LM9QNKu+GU6NJpCwm1C2GDlM+Ci8zKL+UlqYl37HY=");

const lastReplied = new Map();
const COOLDOWN_MS = 2 * 60 * 1000; // 2 дақиқа

(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });

    await client.start({
        phoneNumber: async () => "",
        phoneCode: async () => "",
        onError: (err) => console.log(err),
    });

    console.log("✅ Бот фаъол аст!");

    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.isPrivate || message.out) return;

        const senderId = message.senderId?.toString();
        if (!senderId) return;

        const now = Date.now();
        const last = lastReplied.get(senderId) || 0;
        if (now - last < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
            console.log(`⏳ ${senderId} — cooldown, ${remaining}с қолд.`);
            return;
        }

        try {
            const sender = await message.getSender();
            const name = sender?.firstName || "Дӯстам";
            
            const replyText = `Салом, ${name} 👋\n\nМан боти Муҳсиддин ҳастам 🤖\nва ҳоло Муҳсиддин онлайн нест 🪫\n\nвақте онлайн шуд ба шумо ҳатман ҷавоб медиҳад 🍻`;

            await client.sendMessage(message.chatId, {
                message: replyText,
                replyTo: message.id
            });

            lastReplied.set(senderId, Date.now());
            console.log(`📨 Ба ${name} ҷавоб дода шуд.`);
        } catch (err) {
            console.log("Хатогӣ:", err.message);
        }
    }, new NewMessage({ incoming: true }));
})();
