// ═══════════════════════════════════════════════════════
//   handlers.js — нусхаи ниҳоӣ
// ═══════════════════════════════════════════════════════
const { client, showTyping, addReaction, typewriter, sleep, invoke, isOnline, goOffline } = require("./telegram");
const { FloodWaitError } = require("telegram/errors");
const { Api } = require("telegram");
const { cfg, lastReplied } = require("./state");
const { handleCommand } = require("./menu");

const BOT_REPLIED  = new Map();
const lastOwnerMsg = new Map();

const COOLDOWN_5H = 5 * 60 * 60 * 1000;

const COMMANDS = new Set([
    "/menu", "/settings", "/status", "/help", "/close",
    "/on_ar", "/off_ar", "/on_typing", "/off_typing",
    "/on_reaction", "/off_reaction",
    "/cd1", "/cd2", "/cd5",
    "/sl30", "/sl60", "/sl180",
    "/text",
]);

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
        lastOwnerMsg.set(peerId, Date.now());
        console.log(`✍️  Шумо ба ${peerId} навиштед — бот хомӯш`);
    }
}

async function onIncoming(msg) {
    if (!msg?.isPrivate || msg.out) return;

    const senderId = msg.senderId?.toString();
    if (!senderId) return;

    if (!cfg.autoReply) return;

    // 1. Бот аст?
    try {
        const sender = await msg.getSender();
        if (sender?.bot === true) {
            console.log(`🤖 Бот — ҷавоб намедиҳем`);
            return;
        }
    } catch {}

    const now = Date.now();

    // 2. 10 соат cooldown — бот кабл ҷавоб дод?
    const lastBotReply = BOT_REPLIED.get(senderId) || 0;
    if (now - lastBotReply < COOLDOWN_10H) {
        const h = ((COOLDOWN_10H - (now - lastBotReply)) / 3600000).toFixed(1);
        console.log(`⏳ Cooldown 10ч — ${h} соат қолд`);
        return;
    }

    // 3. Соҳиб бо ин одам кабл гап задааст?
    const ownerLast = lastOwnerMsg.get(senderId) || 0;
    const silenceMs = cfg.silenceMs || 20 * 60 * 1000;
    if (now - ownerLast < silenceMs) {
        const m = Math.ceil((silenceMs - (now - ownerLast)) / 60000);
        console.log(`🤫 Шумо бо у гап задед — ${m} дақ хомӯшӣ`);
        return;
    }

    // 4. 3 сония интизор → онлайн тафтиш
    await sleep(3000);

    const online = await isOnline();
    if (online) {
        console.log(`👤 Онлайн — бот хомӯш`);
        return;
    }

    // 5. cfg cooldown
    const lastReply  = lastReplied.get(senderId) || 0;
    if (now - lastReply < (cfg.cooldownMs || 120000)) {
        console.log(`⏳ cfg Cooldown`);
        return;
    }

    // 6. Ҷавоб
    try {
        const sender = await msg.getSender();
        const name   = sender?.firstName || "Дӯстам";

        const defaultText =
            "Салом, {name} 👋\nМан Боти Muhsin 🧑‍💻\n\n" +
            "Muhsin ҳозир банд мебошад 🪫\n" +
            "Вақте онлайн шавад — ҳатман ҷавоб медиҳад 🍻";
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

        BOT_REPLIED.set(senderId, Date.now());
        lastReplied.set(senderId, Date.now());
        console.log(`📨 Ба "${name}" ҷавоб дода шуд. 10ч cooldown фаъол.`);

        await goOffline();

    } catch (e) {
        if (e instanceof FloodWaitError) await sleep(e.seconds * 1000);
        else console.log("Хатогӣ:", e.message);
    }
}

module.exports = { onOutgoing, onIncoming };