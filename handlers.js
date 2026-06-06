// ═══════════════════════════════════════════════════════
//   handlers.js — Логикаи Олӣ (Автоҷавоби фаврӣ ё СМС-и 2-юм)
// ═══════════════════════════════════════════════════════
const { showTyping, addReaction, typewriter, sleep } = require("./telegram");
const { FloodWaitError } = require("telegram/errors");
const { cfg, lastReplied } = require("./state");
const { handleCommand } = require("./menu");

// Счётчики паёмҳои клиент ва вақти охирини гапи соҳиб
const incomingCount = new Map();
const lastOwnerActive = new Map(); // Вақти охирине, ки ту паём равон кардӣ

// Ҳамаи командаҳои маълум
const COMMANDS = new Set([
    "/menu", "/settings", "/status", "/help", "/close",
    "/on_ar", "/off_ar", "/on_typing", "/off_typing",
    "/on_reaction", "/off_reaction",
    "/cd1", "/cd2", "/cd5",
    "/sl30", "/sl60", "/sl180",
    "/text", ".menu", ".settings", ".status"
]);

async function onOutgoing(msg) {
    if (!msg?.isPrivate || !msg.out) return;

    const peerId = msg.chatId?.toString();
    const text = msg.text?.trim() || "";
    const cmd = text.split(/\s+/)[0].toLowerCase();

    // Команда аст?
    if (COMMANDS.has(cmd)) {
        await handleCommand(msg.chatId, msg.id, text);
        return;
    }

    // ВАҚТЕ ТУ НАВИШТӢ -> Вақти фаъолиятро сабт мекунем ва счётчикро 0 мекунем
    if (peerId) {
        lastOwnerActive.set(peerId, Date.now());
        incomingCount.set(peerId, 0);
        console.log(`✍️  Шумо навиштед -> Суҳбат фаъол шуд. Бот ба режими "ждatи паёми 2-юм" гузашт.`);
    }
}

async function onIncoming(msg) {
    if (!msg?.isPrivate || msg.out) return;

    const senderId = msg.senderId?.toString();
    if (!senderId) return;

    // Автоҷавоб фурӯзон аст?
    const isAutoReplyOn = cfg && typeof cfg.autoReply !== "undefined" ? cfg.autoReply : true;
    if (!isAutoReplyOn) return;

    const now = Date.now();
    const lastActiveTime = lastOwnerActive.get(senderId) || 0;

    // Вақти суҳбати фаъол (масалан 20 дақиқа)
    const silenceMs = cfg && cfg.silenceMs ? cfg.silenceMs : 20 * 60 * 1000;
    const isRecentChat = (now - lastActiveTime) < silenceMs;

    // Ҳисоби паёмҳои клиент
    let currentCount = incomingCount.get(senderId) || 0;
    currentCount += 1;
    incomingCount.set(senderId, currentCount);

    // ── СЦЕНАРИИ 1: ТУ БО КЛИЕНТ НАВ ГАП ЗАДА БАРОМАДӢ (Суҳбати охирин дарунӣ 20 дақ) ──
    if (isRecentChat) {
        console.log(`⏱ Суҳбати охирин нав буд (< 20 дақ). Клиент паёми ${currentCount}-умро равон кард.`);

        if (currentCount < 2) {
            console.log(`🤫 Паёми 1-уми клиент баъди чак-чак. Бот барои чазир накардани суҳбат интизор мешавад.`);
            return;
        }
    }
    // ── СЦЕНАРИИ 2: ТУ УМУМАН ГАП НАЗАДЕСТАӢ (Ё аз гапи охиринат зиёд аз 20 дақиқа гузаштааст) ──
    else {
        console.log(`🔔 Суҳбати фаъол нест (ё вақти зиёд гузашт). Клиент паёми нав равон кард. Бот фаврӣ ҷавоб медиҳад!`);
    }

    // Тафтиши Кулдаун
    const last = lastReplied.get(senderId) || 0;
    const cooldownMs = cfg && cfg.cooldownMs ? cfg.cooldownMs : 120000;
    if (now - last < cooldownMs) {
        console.log(`⏳ Кулдаун фаъол аст.`);
        return;
    }

    try {
        const sender = await msg.getSender();
        const name = sender?.firstName || "Дӯстам";

        const defaultText = "Салом, {name} 👋\nМан Боти Muhsin 🧑‍💻\n\nMuhsin ҳозир банд мебошад 🪫\nВақте онлайн шавад - ҳатман ҷавоб медиҳад 🍻";
        const replyTextTemplate = cfg && cfg.replyText ? cfg.replyText : defaultText;
        const text = replyTextTemplate.replace(/\{name\}/g, name);

        // Аниматсияи реаксия
        const isReactionEnabled = cfg && typeof cfg.reactionEnabled !== "undefined" ? cfg.reactionEnabled : true;
        if (isReactionEnabled) {
            await addReaction(msg.chatId, msg.id, cfg.reactionEmoji || "🤝");
            await sleep(300);
        }

        // Аниматсияи Навиштан
        if (cfg && cfg.typingAnim) {
            await showTyping(msg.chatId);
            await sleep(Math.min(800 + text.length * 10, 3000));
        }

        // Ҷавоб бо таймрайтер
        await typewriter(msg.chatId, msg.id, text);
        lastReplied.set(senderId, Date.now());

        // Баъди ҷавоби бот счётчикро нол мекунем
        incomingCount.set(senderId, 0);
        console.log(`📨 Ба "${name}" ҷавоби автоматӣ фиристода шуд.`);

    } catch (e) {
        if (e instanceof FloodWaitError) {
            await sleep(e.seconds * 1000);
        } else {
            console.log("Хатогӣ:", e.message);
        }
    }
}

module.exports = { onOutgoing, onIncoming };