// ═══════════════════════════════════════════════════════
//  telegram.js — клиент ва функсияҳои Telegram (Ислоҳшуда)
// ═══════════════════════════════════════════════════════
const { TelegramClient } = require("telegram");
const { StringSession }  = require("telegram/sessions");
const { Api }            = require("telegram");
const { FloodWaitError } = require("telegram/errors");
const { HTML }           = require("telegram/extensions"); // Пайваст кардани HTML Парсер
const { apiId, apiHash, session } = require("./config");

const sleep = ms => new Promise(r => setTimeout(r, ms));

const client = new TelegramClient(
    new StringSession(session), apiId, apiHash,
    { connectionRetries: 10, retryDelay: 2000, autoReconnect: true }
);

async function invoke(fn) {
    for (;;) {
        try { return await fn(); }
        catch (e) {
            if (e instanceof FloodWaitError) {
                console.log(`⏳ FloodWait ${e.seconds}с`);
                await sleep(e.seconds * 1000 + 500);
            } else throw e;
        }
    }
}

async function isOnline() {
    try {
        const r = await invoke(() => client.invoke(new Api.users.GetFullUser({ id: "me" })));
        return r.users[0]?.status?.className === "UserStatusOnline";
    } catch { return false; }
}

async function goOffline() {
    try { await invoke(() => client.invoke(new Api.account.UpdateStatus({ offline: true }))); }
    catch {}
}

async function showTyping(chatId) {
    try {
        await invoke(() => client.invoke(new Api.messages.SetTyping({
            peer: chatId, action: new Api.SendMessageTypingAction(),
        })));
    } catch {}
}

async function addReaction(chatId, msgId, emoji) {
    try {
        await invoke(() => client.invoke(new Api.messages.SendReaction({
            peer: chatId, msgId,
            reaction: [new Api.ReactionEmoji({ emoticon: emoji })],
        })));
    } catch (e) { console.log("Реаксия:", e.message); }
}

async function deleteMsg(chatId, id) {
    try {
        await invoke(() => client.invoke(new Api.messages.DeleteMessages({
            id: [id], revoke: false,
        })));
    } catch {}
}

// ── Таймрайтер: Эффекти рехтани шеър (Ултра-тез ва 1-тоӣ) ───────────────────
async function typewriter(chatId, replyToId, fullText) {
    // 🔥 СИРРИ СУРЪАТ: 2 ҳарфӣ мегирем, то лимити Телеграмро дур занем, 
    // аммо эффект маҳз 1-тоӣ ва ултра-тез ба назар мерасад!
    const CHUNK = 3;   

    // Паёми аввал бо курсор
    const sent = await invoke(() =>
        client.sendMessage(chatId, { message: "▍", replyTo: replyToId })
    );

    let shown = "";
    
    // Сикли асосии чопкунӣ
    for (let i = 0; i < fullText.length; i += CHUNK) {
        shown += fullText.slice(i, i + CHUNK);
        
        // 🚀 ТЕЗӢ: Дархостро мефиристем ва "await sleep" намекунем! 
        // Худи суръати иҷрои дархости Телеграм ҳамчун таймер (дилей) хизмат мекунад.
        await invoke(() =>
            client.invoke(new Api.messages.EditMessage({
                peer: chatId, id: sent.id,
                message: shown + "▍ ",
            }))
        ).catch(() => {});
    }

    // Қадами ниҳоӣ: тоза кардани курсор
    await invoke(() =>
        client.invoke(new Api.messages.EditMessage({
            peer: chatId, id: sent.id,
            message: fullText,
        }))
    ).catch(() => {});
}


module.exports = { 
    client, 
    invoke, 
    sleep, 
    isOnline, 
    goOffline, 
    showTyping, 
    addReaction, 
    deleteMsg, 
    typewriter, // Ҳамин функсияи навро мемонем
    HTML 
};