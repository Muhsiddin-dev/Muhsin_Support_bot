// ═══════════════════════════════════════════════════════
//    handlers.js — Ислоҳшуда (Санҷиши Паёмҳои Нахонда ва Офлайн)
// ═══════════════════════════════════════════════════════
const { client, showTyping, addReaction, typewriter, sleep, invoke, isOnline, goOffline } = require("./telegram");
const { FloodWaitError } = require("telegram/errors");
const { Api } = require("telegram");
const { cfg, lastReplied } = require("./state");
const { handleCommand } = require("./menu");

const BOT_REPLIED  = new Map();
const lastOwnerMsg = new Map();

// Тағйирёбандаи дуруст барои Cooldown (дар коди кӯҳна хатои COOLDOWN_10H буд)
const COOLDOWN_10H = 10 * 60 * 60 * 1000; 

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
        console.log(`✍️  Шумо ба ${peerId} навиштед — вақт сабт шуд.`);
    }
}

async function onIncoming(msg) {
    if (!msg?.isPrivate || msg.out) return;

    const senderId = msg.senderId?.toString();
    if (!senderId) return;

    if (!cfg.autoReply) return;

    // 🌟 МУҲОФИЗАТ АЗ LOOP: Агар худат ба боти худат нависӣ
    const nameLower = (msg.sender?.firstName || "").toLowerCase();
    if (nameLower.includes("muhsin") || nameLower.includes("support")) {
        console.log(`🛡️ Бот паёми худиро пайдо кард. Ҷавоб дода намешавад.`);
        return;
    }

    // 1. Бот аст?
    try {
        const sender = await msg.getSender();
        if (sender?.bot === true) {
            console.log(`🤖 Бот — ҷавоб намедиҳем`);
            return;
        }
    } catch {}

    const now = Date.now();

    // 2. 10 соат cooldown — бот қабл ҷавоб дод?
    const lastBotReply = BOT_REPLIED.get(senderId) || 0;
    if (now - lastBotReply < COOLDOWN_10H) {
        const h = ((COOLDOWN_10H - (now - lastBotReply)) / 3600000).toFixed(1);
        console.log(`⏳ Cooldown 10ч — ${h} соат монд`);
        return;
    }

    // 3. 🎯 САНҶИШИ НАВ: Оё паёмҳои нахондашуда (unread) аз ҷониби клиент ҳастанд?
    try {
        const dialogs = await client.getDialogs({});
        const peerDialog = dialogs.find(d => d.id?.toString() === senderId);
        
        // Агар клиент паёми нав дода бошад ва ту онро НАДИДА бошӣ (unreadCount > 0)
        if (peerDialog && peerDialog.unreadCount > 0) {
            console.log(`📩 Клиент паёми нав дорад (${peerDialog.unreadCount} дона) ва шумо онро нахондаед.`);
            // Дар ин ҳолат мо шарти "silenceMs"-ро дур мезанем, чунки ту паёмро нахондаӣ ва ҷавоб надодаӣ!
        } else {
            // Агар паёмҳоро аллакай хонда бошӣ, ҳамон шарти хомӯшии 20-дақиқагӣ кор мекунад
            const ownerLast = lastOwnerMsg.get(senderId) || 0;
            const silenceMs = cfg.silenceMs || 20 * 60 * 1000;
            if (now - ownerLast < silenceMs) {
                const m = Math.ceil((silenceMs - (now - ownerLast)) / 60000);
                console.log(`🤫 Шумо бо у гап задед ва паёмҳоро хондаед — ${m} дақ хомӯшӣ`);
                return;
            }
        }
    } catch (err) {
        console.log("Хатогӣ ҳангоми санҷиши паёмҳои нахонда:", err.message);
    }

    // 4. 3 сония интизор → Онлайн буданро тафтиш мекунем
    await sleep(3000);

    const online = await isOnline();
    if (online) {
        console.log(`👤 Шумо онлайн ҳастед — бот хомӯш мемонад`);
        return;
    }

    // 5. cfg cooldown
    const lastReply  = lastReplied.get(senderId) || 0;
    if (now - lastReply < (cfg.cooldownMs || 120000)) {
        console.log(`⏳ cfg Cooldown`);
        return;
    }

    // 6. Ҷавоб бо таймрайтери тез
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
            await sleep(500); // Интизории кӯтоҳ барои суръати баланд
        }

        // Таймрайтери ултра-тези ту кор мекунад
        await typewriter(msg.chatId, msg.id, text);

        BOT_REPLIED.set(senderId, Date.now());
        lastReplied.set(senderId, Date.now());
        console.log(`📨 Ба "${name}" ҷавоб дода шуд. 10ч cooldown фаъол.`);

        await goOffline();

    } catch (e) {
        if (e instanceof FloodWaitError) await sleep(e.seconds * 1000);
        else console.log("Хатогӣ дар фиристодан:", e.message);
    }
}

module.exports = { onOutgoing, onIncoming };