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

async function isOnline(client) {
    try {
        const result = await client.invoke(new Api.users.GetFullUser({ id: "me" }));
        const status = result.users[0]?.status;
        return status?.className === "UserStatusOnline";
    } catch (e) {
        return false;
    }
}

async function goOffline(client) {
    try {
        await client.invoke(new Api.account.UpdateStatus({ offline: true }));
        console.log("📴 Offline шуд.");
    } catch (e) {}
}

async function sendTyping(client, chatId) {
    try {
        await client.invoke(new Api.messages.SetTyping({
            peer: chatId,
            action: new Api.SendMessageTypingAction()
        }));
    } catch (e) {}
}

async function sendReaction(client, chatId, msgId) {
    try {
        await client.invoke(new Api.messages.SendReaction({
            peer: chatId,
            msgId: msgId,
            reaction: [new Api.ReactionEmoji({ emoticon: "👀" })]
        }));
    } catch (e) {
        console.log("Реаксия нашуд:", e.message);
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

    // Паёмҳои ФИРИСТОДАШУДА — шумо худатон гап задед
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.isPrivate || !message.out) return;
        const peerId = message.chatId?.toString();
        if (peerId) {
            activeChats.add(peerId);
            console.log(`✍️ Шумо ба ${peerId} гап задед — бот хомӯш.`);
        }
    }, new NewMessage({ outgoing: true }));

    // Паёмҳои ВОРИДШАВАНДА
    client.addEventHandler(async (event) => {
        const message = event.message;
        if (!message || !message.isPrivate || message.out) return;

        const senderId = message.senderId?.toString();
        if (!senderId) return;

        if (activeChats.has(senderId)) {
            console.log(`🤫 ${senderId} — бот хомӯш.`);
            return;
        }

        const online = await isOnline(client);
        if (online) {
            console.log(`👤 Онлайн ҳастед — бот хомӯш.`);
            return;
        }

        const now = Date.now();
        const last = lastReplied.get(senderId) || 0;
        if (now - last < COOLDOWN_MS) {
            const remaining = Math.ceil((COOLDOWN_MS - (now - last)) / 1000);
            console.log(`⏳ Cooldown, ${remaining}с қолд.`);
            return;
        }

        try {
            const sender = await message.getSender();
            const name = sender?.firstName || "Дӯстам";

            // 1. Реаксия 👀
            await sendReaction(client, message.chatId, message.id);

            // 2. Typing 2 сония
            await sendTyping(client, message.chatId);
            await new Promise(r => setTimeout(r, 2000));

            // 3. Ҷавоб — бе тугма (userbot тугма намефиристад)
            const replyText = `Салом, ${name} 👋\n\nМан ҳозир дастрас нестам 🪫\nВақте онлайн шавам паёматонро хонда ҳатман ҷавоб медиҳам 🍻`;

            await client.sendMessage(message.chatId, {
                message: replyText,
                replyTo: message.id
            });

            lastReplied.set(senderId, Date.now());
            console.log(`📨 Ба ${name} ҷавоб дода шуд.`);

            // 4. Offline
            await goOffline(client);

        } catch (err) {
            console.log("Хатогӣ:", err.message);
        }
    }, new NewMessage({ incoming: true }));
})();