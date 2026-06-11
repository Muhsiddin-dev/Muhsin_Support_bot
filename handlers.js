// ═══════════════════════════════════════════════════════
//   handlers.js — нусхаи ниҳоӣ
// ═══════════════════════════════════════════════════════
const { client, showTyping, addReaction, typewriter, sleep, invoke, isOnline, goOffline } = require("./telegram");
const { FloodWaitError } = require("telegram/errors");
const { Api } = require("telegram");
const { cfg, lastReplied } = require("./state");
const { handleCommand } = require("./menu");

// userId → вақти охирини ҷавоби бот (10 соат cooldown)
const BOT_REPLIED   = new Map();
// userId → вақти охирини паёми соҳиб ба ин одам
const lastOwnerMsg  = new Map();

const COOLDOWN_5H  = 5 * 60 * 60 * 1000; // 10 соат

const COMMANDS = new Set([
    "/menu", "/settings", "/status", "/help", "/close",
    "/on_ar", "/off_ar", "/on_typing", "/off_typing",
    "/on_reaction", "/off_reaction",
    "/cd1", "/cd2", "/cd5",
    "/sl30", "/sl60", "/sl180",
    "/text",
]);

// ── Соҳиб паём навишт ─────────────────────────────────
async function onOutgoing(msg) {
    if (!msg?.isPrivate || !msg.out) return;

    const peerId = msg.chatId?.toString();
    const text   = msg.text?.trim() || "";
    const cmd    = text.split(/\s+/)[0].toLowerCase();

    // Команда?
    if (COMMANDS.has(cmd)) {
        await handleCommand(msg.chatId, msg.id, text);
        return;
    }

    // Соҳиб ба ин одам навишт — вақтро сабт мекунем
    if (peerId) {
        lastOwnerMsg.set(peerId, Date.now());
        console.log(`✍️  Шумо ба ${peerId} навиштед — бот хомӯш мешавад`);
    }
}

// ── Паёми воридшаванда ────────────────────────────────
async function onIncoming(msg) {
    if (!msg?.isPrivate || msg.out) return;

    const senderId = msg.senderId?.toString();
    if (!senderId) return;

    // ── 1. Автоҷавоб хомӯш аст? ──────────────────────
    if (!cfg.autoReply) {
        console.log("🔕 Автоҷавоб хомӯш аст");
        return;
    }

    // ── 2. Фиристанда бот аст? ────────────────────────
    try {
        const sender = await msg.getSender();
        if (sender?.bot === true) {
            console.log(`🤖 Бот аст (${sender.username || senderId}) — ҷавоб намедиҳем`);
            return;
        }
    } catch {}

    const now = Date.now();

    // ── 3. Бот кабл ба ин одам ҷавоб додааст? (10 соат) ─
    const lastBotReply = BOT_REPLIED.get(senderId) || 0;
    if (now - lastBotReply < COOLDOWN_10H) {
        const hoursLeft = ((COOLDOWN_10H - (now - lastBotReply)) / 3600000).toFixed(1);
        console.log(`⏳ ${senderId} — бот кабл ҷавоб дод, ${hoursLeft}с соат қолд`);
        return;
    }

    // ── 4. Соҳиб бо ин одам гап задааст? ─────────────
    const ownerLastMsg = lastOwnerMsg.get(senderId) || 0;
    const silenceMs    = cfg.silenceMs || 20 * 60 * 1000;
    if (now - ownerLastMsg < silenceMs) {
        const minLeft = Math.ceil((silenceMs - (now - ownerLastMsg)) / 60000);
        console.log(`🤫 Шумо бо ин одам гап задед — ${minLeft} дақ хомӯшӣ қолд`);
        return;
    }

    // ── 5. Соҳиб онлайн аст? (авал тафтиш) ──────────
    // 3 сония интизор мешавем — агар дар ин муддат чатро кушод онлайн мешавад
    await sleep(3000);

    const online = await isOnline();
    if (online) {
        console.log(`👤 Шумо онлайн ҳастед — бот хомӯш аст`);
        return;
    }

    // ── 6. Cooldown (танзими cfg) ─────────────────────
    const lastReply  = lastReplied.get(senderId) || 0;
    const cooldownMs = cfg.cooldownMs || 120000;
    if (now - lastReply < cooldownMs) {
        console.log(`⏳ Cooldown — ${Math.ceil((cooldownMs-(now-lastReply))/1000)}с қолд`);
        return;
    }

    // ── 7. Ҷавоб медиҳем ─────────────────────────────
    try {
        const sender = await msg.getSender();
        const name   = sender?.firstName || "Дӯстам";

        const defaultText =
            "Салом, {name} 👋\nМан Боти Muhsin 🧑‍💻\n\n" +
            "Muhsin ҳозир банд мебошад 🪫\n" +
            "Вақте онлайн шавад — ҳатман ҷавоб медиҳад 🍻";
        const text = (cfg.replyText || defaultText).replace(/\{name\}/g, name);

        // Реаксия
        if (cfg.reactionEnabled) {
            await addReaction(msg.chatId, msg.id, cfg.reactionEmoji || "🤝");
            await sleep(300);
        }

        // Аниматсия
        if (cfg.typingAnim) {
            await showTyping(msg.chatId);
            await sleep(Math.min(800 + text.length * 10, 3000));
        }

        // Ҷавоб
        await typewriter(msg.chatId, msg.id, text);

        // Вақтро сабт мекунем
        BOT_REPLIED.set(senderId, Date.now());
        lastReplied.set(senderId, Date.now());

        console.log(`📨 Ба "${name}" ҷавоб дода шуд. Cooldown 10 соат фаъол.`);

        await goOffline();

    } catch (e) {
        if (e instanceof FloodWaitError) await sleep(e.seconds * 1000);
        else console.log("Хатогӣ:", e.message);
    }
}

module.exports = { onOutgoing, onIncoming };