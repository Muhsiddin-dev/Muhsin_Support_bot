require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { Api } = require("telegram");
 
const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const stringSession = new StringSession("1AgAOMTQ5LjE1NC4xNjcuNDEBu3sVC2Oe3KcUaCbYlbhQ+jyOrLb07B92xlpYg7cFjUTK50IHswZ698p72KIrnhjoiLSGQrFgbkUqKfLBLddwefQDs5hO3QqiX8vwP/bjyRd18rjGFZSLl46XmfbDEdKPptlrLjCnhdn5yogsFDhg3YvheNEVcDuRls6NH4xe/TkkzW8YumJF7j1xFkjLakYoE0xpjyasPRpDLerR5amjKPlUSn9xcl6jlXkHFZlp8/7McUt3a4z8RZ5DcUHbO7mContQAM474/zmhXzTrJYpJyyPRUNL7TyewHzMnpdpF1D9p7LM9QNKu+GU6NJpCwm1C2GDlM+Ci8zKL+UlqYl37HY=");
 
const lastReplied = new Map();
const activeChats = new Set();
const COOLDOWN_MS = 2 * 60 * 1000;
 
// Тафтиши онлайн будани худатон
async function isOnline(client) {
    try {
        const result = await client.invoke(
            new Api.users.GetFullUser({ id: "me" })
        );
        const status = result.users[0]?.status;
        if (!status) return false;
        return status.className === "UserStatusOnline";
    } catch (e) {
        console.log("Хатогии статус:", e.message);
        return false;
    }
}
 
// Offline кардани аккаунт
async function goOffline(client) {
    try {
        await client.invoke(
            new Api.account.UpdateStatus({ offline: true })
        );
        console.log("📴 Аккаунт offline шуд.");
    } catch (e) {
        console.log("Хатогии offline:", e.message);
    }
}
 
(async () => {
    const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 5 });
 
    await client.start({
        phoneNumber: async () => "",
        phoneCode: async () => "",
        onError: (err) => console.log(err),
    });
 
    console.log("✅ Бот фаъол аст!");
 
    // Паёмҳои ФИРИСТОДАШУДА — шумо худатон гап мезанед
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.isPrivate || !message.out) return;
 
        const peerId = message.chatId?.toString();
        if (peerId) {
            activeChats.add(peerId);
            console.log(`✍️ Шумо ба ${peerId} гап задед — бот барои у ҳамеша хомӯш.`);
        }
    }, new NewMessage({ outgoing: true }));
 
    // Паёмҳои ВОРИДШАВАНДА — автоҷавоб
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.isPrivate || message.out) return;
 
        const senderId = message.senderId?.toString();
        if (!senderId) return;
 
        // Агар шумо кабл бо ин одам гап задед — бот ҳамеша хомӯш
        if (activeChats.has(senderId)) {
            console.log(`🤫 ${senderId} — шумо бо у гап задед, бот хомӯш.`);
            return;
        }
 
        // Агар шумо онлайн бошед — бот ҷавоб надиҳад
        const online = await isOnline(client);
        if (online) {
            console.log(`👤 Шумо онлайн ҳастед — бот ҷавоб намедиҳад.`);
            return;
        }
 
        // Cooldown тафтиш
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
            console.log(`📨 Ба ${name} автоҷавоб фиристода шуд.`);
 
            // Баъди ҷавоб — сразу offline
            await goOffline(client);
 
        } catch (err) {
            console.log("Хатогӣ:", err.message);
        }
    }, new NewMessage({ incoming: true }));
})();