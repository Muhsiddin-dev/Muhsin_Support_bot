// ═══════════════════════════════════════════════════════
//  menu.js — менюи идоракунӣ (Ниҳоӣ бо Markdown - 100% Кор мекунад)
// ═══════════════════════════════════════════════════════
const { client, invoke, deleteMsg } = require("./telegram");
const { cfg, menuState } = require("./state");

// Функсияи сохтани силкаи кликшаванда бо усули Markdown
function makeCmd(command) {
    return ` ${command} `;
}

// ── Менюи асосӣ ───────────────────────────────────────
function buildMainMenu() {
    return `🤖 **Muhsin Userbot**

Салом! Ин панели идоракунии бот аст.
Аз зер интихоб кунед:

╔══════════════════════════╗
║  **Саҳифаҳо** ║
╠══════════════════════════╣
║  ${makeCmd("/settings")}  — ⚙️ Танзимот       ║
║  ${makeCmd("/status")}    — 📊 Ҳолат          ║
║  ${makeCmd("/help")}      — 📖 Роҳнамо        ║
║  ${makeCmd("/close")}     — ❌ Пӯшидан        ║
╚══════════════════════════╝`;
}

// ── Танзимот ──────────────────────────────────────────
function buildSettings() {
    const ar = cfg.autoReply ? "🟢" : "🔴";
    const typ = cfg.typingAnim ? "🟢" : "🔴";
    const re = cfg.reactionEnabled ? "🟢" : "🔴";

    const arCmd = cfg.autoReply ? "/off_ar" : "/on_ar";
    const typCmd = cfg.typingAnim ? "/off_typing" : "/on_typing";
    const reCmd = cfg.reactionEnabled ? "/off_reaction" : "/on_reaction";

    const arTxt = cfg.autoReply ? "Хомӯш кардан" : "Фаъол кардан";
    const typTxt = cfg.typingAnim ? "Хомӯш кардан" : "Фаъол кардан";
    const reTxt = cfg.reactionEnabled ? "Хомӯш кардан" : "Фаъол кардан";

    return `⚙️ **Танзимот**

━━━━━━━━━━━━━━━━━━━━━━━━━
${ar} **Автоҷавоб**
_Вақте офлайн бошед — бот ҷавоб медиҳад_
👉 ${makeCmd(arCmd)} — ${arTxt}

━━━━━━━━━━━━━━━━━━━━━━━━━
${typ} **Аниматсияи навиштан**
_Матн ҳарф ба ҳарф пайдо мешавад_
👉 ${makeCmd(typCmd)} — ${typTxt}

━━━━━━━━━━━━━━━━━━━━━━━━━
${re} **Реаксия**
_Ба паёми воридшаванда ${cfg.reactionEmoji} мегузорад_
👉 ${makeCmd(reCmd)} — ${reTxt}

━━━━━━━━━━━━━━━━━━━━━━━━━
⏱ **Кулдаун** — \`${cfg.cooldownMs / 60000} дақ\`
_Байни ду ҷавоби автоматӣ ба як нафар_
👉 ${makeCmd("/cd1")} · ${makeCmd("/cd2")} · ${makeCmd("/cd5")}

━━━━━━━━━━━━━━━━━━━━━━━━━
🔇 **Хомӯшӣ баъди ҷавоби шумо** — \`${cfg.silenceMs / 60000} дақ\`
_Вақте шумо ҷавоб додед, бот чӣ қадар хомӯш монад_
👉 ${makeCmd("/sl30")} · ${makeCmd("/sl60")} · ${makeCmd("/sl180")}

━━━━━━━━━━━━━━━━━━━━━━━━━
✏️ **Матни ҷавоб:**
\`/text Салом {name}! Ман нестам 🪫\`

${makeCmd("/menu")} — 🏠 Бозгашт`;
}

// ── Ҳолат ─────────────────────────────────────────────
function buildStatus() {
    const v = s => s ? "🟢 Фаъол" : "🔴 Хомӯш";
    return `📊 **Ҳолати ҷорӣ**

🔁 Автоҷавоб:     ${v(cfg.autoReply)}
⌨️  Аниматсия:     ${v(cfg.typingAnim)}
🤝 Реаксия:        ${v(cfg.reactionEnabled)}
⏱  Кулдаун:       \`${cfg.cooldownMs / 60000} дақ\`
🔇 Хомӯшӣ:        \`${cfg.silenceMs / 60000} дақ\`

📝 **Матни ҷавоб:**
_${cfg.replyText}_

${makeCmd("/settings")} — Тағйир додан
${makeCmd("/menu")} — 🏠 Бозгашт`;
}

// ── Роҳнамо ───────────────────────────────────────────
function buildHelp() {
    return `📖 **Роҳнамо**

Ин бот аз номи шумо ҷавоб медиҳад, вақте офлайн ҳастед.

━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 **Саҳифаҳо:**
${makeCmd("/menu")}     — Менюи асосӣ
${makeCmd("/settings")} — Танзимот
${makeCmd("/status")}   — Ҳолати ҷорӣ
${makeCmd("/close")}    — Пӯшидан

━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ **Тағйироти зуд:**
${makeCmd("/on_ar")} · ${makeCmd("/off_ar")}           — Автоҷавоб
${makeCmd("/on_typing")} · ${makeCmd("/off_typing")}   — Аниматсия
${makeCmd("/on_reaction")} · ${makeCmd("/off_reaction")} — Реаксия

${makeCmd("/cd1")} · ${makeCmd("/cd2")} · ${makeCmd("/cd5")}         — Кулдаун (дақ)
${makeCmd("/sl30")} · ${makeCmd("/sl60")} · ${makeCmd("/sl180")}     — Хомӯшӣ (дақ)

━━━━━━━━━━━━━━━━━━━━━━━━━
✏️ **Матн тағйир кардан:**
\`/text Салом {name}! Ман нестам\`
_{name} — ба номи фиристанда иваз мешавад_

${makeCmd("/menu")} — 🏠 Бозгашт`;
}

// ── Фиристодан / таҳрир ───────────────────────────────
async function sendPage(chatId, text) {
    if (menuState.msgId && menuState.chatId?.toString() === chatId?.toString()) {
        try {
            await client.editMessage(chatId, {
                message: menuState.msgId,
                text: text,
                parseMode: "markdown",
                linkPreview: false
            });
            return;
        } catch (err) {
            console.log("Хатогии таҳрир:", err.message);
        }
    }

    try {
        const m = await client.sendMessage(chatId, {
            message: text,
            parseMode: "markdown",
            linkPreview: false
        });
        menuState.msgId = m.id;
        menuState.chatId = chatId;
    } catch (err) {
        console.log("Хатогии фиристодан:", err.message);
    }
}

// ── Командаҳо ─────────────────────────────────────────
async function handleCommand(chatId, msgId, rawText) {
    const [cmd, ...rest] = rawText.trim().split(/\s+/);
    const arg = rest.join(" ");

    await deleteMsg(chatId, msgId);

    switch (cmd.toLowerCase()) {
        case "/menu": await sendPage(chatId, buildMainMenu()); return;
        case "/settings": await sendPage(chatId, buildSettings()); return;
        case "/status": await sendPage(chatId, buildStatus()); return;
        case "/help": await sendPage(chatId, buildHelp()); return;

        case "/close":
            if (menuState.msgId) {
                await deleteMsg(chatId, menuState.msgId);
                menuState.msgId = null;
                menuState.chatId = null;
            }
            return;

        case "/on_ar": cfg.autoReply = true; break;
        case "/off_ar": cfg.autoReply = false; break;
        case "/on_typing": cfg.typingAnim = true; break;
        case "/off_typing": cfg.typingAnim = false; break;
        case "/on_reaction": cfg.reactionEnabled = true; break;
        case "/off_reaction": cfg.reactionEnabled = false; break;

        case "/cd1": cfg.cooldownMs = 1 * 60 * 1000; break;
        case "/cd2": cfg.cooldownMs = 2 * 60 * 1000; break;
        case "/cd5": cfg.cooldownMs = 5 * 60 * 1000; break;

        case "/sl30": cfg.silenceMs = 30 * 60 * 1000; break;
        case "/sl60": cfg.silenceMs = 60 * 60 * 1000; break;
        case "/sl180": cfg.silenceMs = 180 * 60 * 1000; break;

        case "/text":
            if (arg) cfg.replyText = arg;
            break;

        default: return;
    }

    await sendPage(chatId, buildSettings());
}

module.exports = { handleCommand, buildMainMenu };