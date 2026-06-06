require('dotenv').config();
const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const { NewMessage } = require("telegram/events");
const { Api } = require("telegram");
const { FloodWaitError } = require("telegram/errors");

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const apiId     = parseInt(process.env.API_ID);
const apiHash   = process.env.API_HASH;
const SESSION   = process.env.SESSION_STRING || "";
const OWNER_CMD = ".menu"; // secret command — only owner sees this

const DEFAULT_SETTINGS = {
    autoReply:       true,
    typingAnim:      true,
    reactionEnabled: true,
    reactionEmoji:   "👀",
    cooldownMs:      2 * 60 * 1000,   // 2 min between auto-replies per user
    silenceMs:       60 * 60 * 1000,  // 1 hr silence after owner replies
    replyText:       "Салом, {name} 👋\n\nМан ҳозир дастрас нестам 🪫\nПаёматонро хондам — вақте онлайн шавам ҳатман ҷавоб медиҳам 🍻",
};

// ─── STATE ────────────────────────────────────────────────────────────────────
let cfg = { ...DEFAULT_SETTINGS };

// lastReplied[userId]  = timestamp of last auto-reply sent
const lastReplied  = new Map();
// silenced[userId]     = timestamp until which bot is silent (owner replied)
const silenced     = new Map();
// menuMsgId            = { chatId, msgId } of the last .menu message (for editing)
let menuMsg        = null;

// ─── TELEGRAM CLIENT ──────────────────────────────────────────────────────────
const client = new TelegramClient(
    new StringSession(SESSION),
    apiId,
    apiHash,
    { connectionRetries: 5, retryDelay: 1000, autoReconnect: true }
);

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function safeInvoke(fn) {
    while (true) {
        try {
            return await fn();
        } catch (e) {
            if (e instanceof FloodWaitError) {
                console.log(`⏳ FloodWait ${e.seconds}s — кутубем...`);
                await sleep(e.seconds * 1000 + 500);
            } else {
                throw e;
            }
        }
    }
}

async function isOnline() {
    try {
        const res = await safeInvoke(() =>
            client.invoke(new Api.users.GetFullUser({ id: "me" }))
        );
        return res.users[0]?.status?.className === "UserStatusOnline";
    } catch { return false; }
}

async function goOffline() {
    try {
        await safeInvoke(() =>
            client.invoke(new Api.account.UpdateStatus({ offline: true }))
        );
    } catch {}
}

async function sendTyping(chatId) {
    try {
        await safeInvoke(() =>
            client.invoke(new Api.messages.SetTyping({
                peer: chatId,
                action: new Api.SendMessageTypingAction(),
            }))
        );
    } catch {}
}

async function sendReaction(chatId, msgId) {
    try {
        await safeInvoke(() =>
            client.invoke(new Api.messages.SendReaction({
                peer: chatId,
                msgId,
                reaction: [new Api.ReactionEmoji({ emoticon: cfg.reactionEmoji })],
            }))
        );
    } catch (e) {
        console.log("Реаксия:", e.message);
    }
}

// Typewriter effect — edits message char by char in chunks
async function typewriterSend(chatId, replyToId, fullText) {
    // Send empty first, then edit progressively
    const CHUNK = 6; // chars per tick
    const DELAY = 80; // ms per tick

    const sent = await safeInvoke(() =>
        client.sendMessage(chatId, {
            message: "✍️",
            replyTo: replyToId,
        })
    );

    let displayed = "";
    for (let i = 0; i < fullText.length; i += CHUNK) {
        displayed += fullText.slice(i, i + CHUNK);
        await safeInvoke(() =>
            client.invoke(new Api.messages.EditMessage({
                peer: chatId,
                id: sent.id,
                message: displayed + "▍",
            }))
        );
        await sleep(DELAY);
    }

    // Final clean message without cursor
    await safeInvoke(() =>
        client.invoke(new Api.messages.EditMessage({
            peer: chatId,
            id: sent.id,
            message: fullText,
        }))
    );

    return sent;
}

// ─── MENU BUILDER ─────────────────────────────────────────────────────────────
function buildMenuText() {
    return (
        `⚙️ **Muhsin Userbot — Панели идоракунӣ**\n\n` +
        `🤖 Auto-Reply:       ${cfg.autoReply       ? "✅ ON" : "❌ OFF"}\n` +
        `⌨️  Typing Anim:     ${cfg.typingAnim      ? "✅ ON" : "❌ OFF"}\n` +
        `👀 Reaction:         ${cfg.reactionEnabled ? "✅ ON" : "❌ OFF"}\n` +
        `⏱  Cooldown:        ${cfg.cooldownMs / 60000} дақиқа\n` +
        `🔇 Silence after me: ${cfg.silenceMs  / 60000} дақиқа\n\n` +
        `_Барои тағйир тугмаро пахш кунед_`
    );
}

function buildMenuButtons() {
    return [
        [
            { text: `🤖 Auto-Reply: ${cfg.autoReply ? "ON ✅" : "OFF ❌"}`,       data: "toggle_autoReply"  },
        ],
        [
            { text: `⌨️ Typing: ${cfg.typingAnim ? "ON ✅" : "OFF ❌"}`,           data: "toggle_typingAnim" },
            { text: `👀 Reaction: ${cfg.reactionEnabled ? "ON ✅" : "OFF ❌"}`,    data: "toggle_reaction"   },
        ],
        [
            { text: "⏱ Cooldown: 1 мин",  data: "cd_1"  },
            { text: "⏱ Cooldown: 2 мин",  data: "cd_2"  },
            { text: "⏱ Cooldown: 5 мин",  data: "cd_5"  },
        ],
        [
            { text: "🔇 Silence: 30 дақ",  data: "sl_30"  },
            { text: "🔇 Silence: 1 соат",  data: "sl_60"  },
            { text: "🔇 Silence: 3 соат",  data: "sl_180" },
        ],
        [
            { text: "🔄 Refresh",  data: "refresh" },
            { text: "❌ Close",    data: "close"   },
        ],
    ];
}

async function sendOrEditMenu(chatId, editMsgId = null) {
    const text    = buildMenuText();
    const buttons = buildMenuButtons();

    if (editMsgId) {
        try {
            await safeInvoke(() =>
                client.invoke(new Api.messages.EditMessage({
                    peer: chatId,
                    id: editMsgId,
                    message: text,
                    parseMode: "markdown",
                    replyMarkup: new Api.ReplyInlineMarkup({
                        rows: buttons.map(row =>
                            new Api.KeyboardButtonRow({
                                buttons: row.map(b =>
                                    new Api.KeyboardButtonCallback({
                                        text: b.text,
                                        data: Buffer.from(b.data),
                                    })
                                ),
                            })
                        ),
                    }),
                }))
            );
            return editMsgId;
        } catch {}
    }

    const msg = await safeInvoke(() =>
        client.sendMessage(chatId, {
            message: text,
            parseMode: "markdown",
            buttons: buttons.map(row =>
                row.map(b => new Api.KeyboardButtonCallback({
                    text: b.text,
                    data: Buffer.from(b.data),
                }))
            ),
        })
    );
    return msg.id;
}

// ─── CALLBACK QUERY HANDLER ───────────────────────────────────────────────────
async function handleCallback(event) {
    try {
        const data   = event.data?.toString();
        const chatId = event.chat?.id || event.query?.peer;
        const msgId  = event.messageId;

        if (!data) return;

        // Answer the callback to remove spinner
        await safeInvoke(() =>
            client.invoke(new Api.messages.SetBotCallbackAnswer({
                queryId: event.query.queryId,
                alert:   false,
            }))
        ).catch(() => {});

        switch (data) {
            case "toggle_autoReply":   cfg.autoReply       = !cfg.autoReply;       break;
            case "toggle_typingAnim":  cfg.typingAnim      = !cfg.typingAnim;      break;
            case "toggle_reaction":    cfg.reactionEnabled = !cfg.reactionEnabled; break;
            case "cd_1":   cfg.cooldownMs = 1  * 60 * 1000; break;
            case "cd_2":   cfg.cooldownMs = 2  * 60 * 1000; break;
            case "cd_5":   cfg.cooldownMs = 5  * 60 * 1000; break;
            case "sl_30":  cfg.silenceMs  = 30 * 60 * 1000; break;
            case "sl_60":  cfg.silenceMs  = 60 * 60 * 1000; break;
            case "sl_180": cfg.silenceMs  = 3 * 60 * 60 * 1000; break;
            case "refresh": break; // just re-render
            case "close":
                await safeInvoke(() =>
                    client.invoke(new Api.messages.DeleteMessages({
                        id: [msgId], revoke: true,
                    }))
                ).catch(() => {});
                menuMsg = null;
                return;
        }

        await sendOrEditMenu(chatId, msgId);
        console.log(`⚙️ Тугма: ${data} | autoReply=${cfg.autoReply}`);
    } catch (e) {
        console.log("Callback хатогӣ:", e.message);
    }
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
(async () => {
    await client.connect();

    // Verify connection
    const me = await client.getMe();
    console.log(`✅ Пайваст: @${me.username || me.firstName} (id: ${me.id})`);
    console.log(`📋 Менюро бо "${OWNER_CMD}" кушоед`);

    // ── Outgoing messages (owner typing) ──────────────────────────────────────
    client.addEventHandler(async (event) => {
        const msg = event.message;
        if (!msg?.isPrivate || !msg.out) return;

        const peerId = msg.chatId?.toString();
        if (!peerId) return;

        // Owner replied → silence bot for this user
        silenced.set(peerId, Date.now() + cfg.silenceMs);
        console.log(`✍️  Шумо ба ${peerId} ҷавоб додед → бот ${cfg.silenceMs / 60000} дақ хомӯш.`);

        // Check for .menu command
        const text = msg.text?.trim();
        if (text === OWNER_CMD) {
            // Delete the command message first
            await safeInvoke(() =>
                client.invoke(new Api.messages.DeleteMessages({
                    id: [msg.id], revoke: false,
                }))
            ).catch(() => {});

            const chatId = msg.chatId;
            const newMsgId = await sendOrEditMenu(
                chatId,
                menuMsg?.chatId?.toString() === chatId?.toString() ? menuMsg.msgId : null
            );
            menuMsg = { chatId, msgId: newMsgId };
        }
    }, new NewMessage({ outgoing: true }));

    // ── Callback queries (inline button presses) ──────────────────────────────
    client.addEventHandler(handleCallback, new (require("telegram/events").CallbackQuery)());

    // ── Incoming private messages ─────────────────────────────────────────────
    client.addEventHandler(async (event) => {
        const msg = event.message;
        if (!msg?.isPrivate || msg.out) return;

        const senderId = msg.senderId?.toString();
        if (!senderId) return;

        // Auto-reply globally OFF?
        if (!cfg.autoReply) return;

        // Owner silenced this chat?
        const silenceUntil = silenced.get(senderId) || 0;
        if (Date.now() < silenceUntil) {
            const mins = Math.ceil((silenceUntil - Date.now()) / 60000);
            console.log(`🔇 ${senderId} — хомӯш, ${mins} дақ қолд.`);
            return;
        }

        // Owner online?
        const online = await isOnline();
        if (online) {
            console.log(`👤 Онлайн ҳастед — бот хомӯш.`);
            return;
        }

        // Cooldown
        const now  = Date.now();
        const last = lastReplied.get(senderId) || 0;
        if (now - last < cfg.cooldownMs) {
            const secs = Math.ceil((cfg.cooldownMs - (now - last)) / 1000);
            console.log(`⏳ ${senderId} — cooldown, ${secs}с қолд.`);
            return;
        }

        try {
            const sender = await msg.getSender();
            const name   = sender?.firstName || "Дӯстам";
            const text   = cfg.replyText.replace("{name}", name);

            // 1. Reaction
            if (cfg.reactionEnabled) {
                await sendReaction(msg.chatId, msg.id);
                await sleep(400);
            }

            // 2. Typing indicator
            if (cfg.typingAnim) {
                await sendTyping(msg.chatId);
                // realistic delay based on text length
                const delay = Math.min(1000 + text.length * 18, 4000);
                await sleep(delay);
            }

            // 3. Typewriter send
            await typewriterSend(msg.chatId, msg.id, text);

            lastReplied.set(senderId, Date.now());
            console.log(`📨 Ба ${name} typewriter-ҷавоб дода шуд.`);

            // 4. Go offline
            await goOffline();

        } catch (err) {
            if (err instanceof FloodWaitError) {
                console.log(`⏳ FloodWait ${err.seconds}s`);
                await sleep(err.seconds * 1000);
            } else {
                console.log("Хатогӣ:", err.message);
            }
        }
    }, new NewMessage({ incoming: true }));

    console.log("🚀 Userbot пурра фаъол аст!");
})();