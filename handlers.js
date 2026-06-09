// ═══════════════════════════════════════════════════════
//   handlers.js — бот танҳо вақте ҷавоб медиҳад ки паём хонда нашуда бошад
// ═══════════════════════════════════════════════════════
const { client, showTyping, addReaction, typewriter, sleep, invoke } = require("./telegram");
const { FloodWaitError } = require("telegram/errors");
const { Api } = require("telegram");
const { cfg, lastReplied } = require("./state");
const { handleCommand } = require("./menu");

const lastOwnerActive = new Map();
const incomingCount   = new Map();

const COMMANDS = new Set([
    "/menu", "/settings", "/status", "/help", "/close",
    "/on_ar", "/off_ar", "/on_typing", "/off_typing",
    "/on_reaction", "/off_reaction",
    "/cd1", "/cd2", "/cd5",
    "/sl30", "/sl60", "/sl180",
    "/text",
]);

// Тафтиш: оё паём хонда шудааст?
async function isMessageRead(chatId, msgId) {
    try {
        const result = await invoke(() =>
            client.invoke(new Api.messages.GetDialogs({
                offsetDate: 0,
                offsetId: 0,
                offsetPeer: new Api.InputPeerEmpty(),
                limit: 20,
                hash: BigInt(0),
            }))
        );

        for (const dialog of result.dialogs || []) {
            const peer = dialog.peer;
            // Чати мувофиқро меёбем
            const peerId = peer?.userId?.toString() || peer?.chatId?.toString();
            if (peerId !== chatId?.toString()) continue;

            // readInboxMaxId — id-и охирин паёми хондашуда аз тарафи мо
            if (dialog.readInboxMaxId >= msgId) {
                return true; // хондаем
            }
            return false;
        }
        return false;
    } catch (e) {
        console.log("Хатогии read check:", e.message);
        return false; // агар хато → фарз мекунем нахондаем → бот ҷавоб медиҳад
    }
}

async function onOutgoing(msg) {
    if (!msg?.isPrivate || !msg.out) return;

    const peerId = msg.chatId?.toString();
    const text   = msg.text?.trim() || "";
    const cmd    = text.split(/\s+/)[0].toLowerCase();

    if (COMMANDS.has(cmd)) {
        await handleCommand(msg.chatId, msg.id, text);
        return;
    }

    if (peerId) {
        lastOwnerActive.set(peerId, Date.now());
        incomingCount.set(peerId, 0);
        console.log(`✍️  Шумо навиштед → бот хомӯш мешавад`);
    }
}

async function onIncoming(msg) {
    if (!msg?.isPrivate || msg.out) return;

    const senderId = msg.senderId?.toString();
    if (!senderId) return;

    if (!cfg.autoReply) return;

    const now            = Date.now();
    const lastActiveTime = lastOwnerActive.get(senderId) || 0;
    const silenceMs      = cfg.silenceMs || 20 * 60 * 1000;
    const isRecentChat   = (now - lastActiveTime) < silenceMs;

    let currentCount = (incomingCount.get(senderId) || 0) + 1;
    incomingCount.set(senderId, currentCount);

    if (isRecentChat && currentCount < 2) {
        console.log(`🤫 Суҳбат нав буд, паёми 1-ум — интизор`);
        return;
    }

    // Cooldown
    const last      = lastReplied.get(senderId) || 0;
    const cooldownMs = cfg.cooldownMs || 120000;
    if (now - last < cooldownMs) {
        console.log(`⏳ Cooldown фаъол аст`);
        return;
    }

    // ✅ 3 сония интизор мешавем — шояд шумо чатро кушоед
    const READ_WAIT_MS = 3000;
    console.log(`👁 ${READ_WAIT_MS / 1000}с интизор — оё паём хонда мешавад?`);
    await sleep(READ_WAIT_MS);

    // Тафтиш: хондааст?
    const wasRead = await isMessageRead(msg.chatId, msg.id);
    if (wasRead) {
        console.log(`👁 Паём хонда шуд — бот хомӯш аст`);
        return;
    }

    console.log(`🔔 Паём хонда нашуд — бот ҷавоб медиҳад`);

    try {
        const sender = await msg.getSender();
        const name   = sender?.firstName || "Дӯстам";

        const defaultText = "Салом, {name} 👋\nМан Боти Muhsin 🧑‍💻\n\nMuhsin ҳозир банд мебошад 🪫\nВақте онлайн шавад - ҳатман ҷавоб медиҳад 🍻";
        const text = (cfg.replyText || defaultText).replace(/\{name\}/g, name);

        if (cfg.reactionEnabled) {
            await addReaction(msg.chatId, msg.id, cfg.reactionEmoji || "🤝");
            await sleep(300);
        }

        if (cfg.typingAnim) {
            await showTyping(msg.chatId);
            await sleep(Math.min(800 + text.length * 10, 3000));
        }

        await typewriter(msg.chatId, msg.id, text);
        lastReplied.set(senderId, Date.now());
        incomingCount.set(senderId, 0);
        console.log(`📨 Ба "${name}" ҷавоб фиристода шуд`);

    } catch (e) {
        if (e instanceof FloodWaitError) await sleep(e.seconds * 1000);
        else console.log("Хатогӣ:", e.message);
    }
}

module.exports = { onOutgoing, onIncoming };
