// ═══════════════════════════════════════════════════════
//  state.js — ҳолати зинда (дар хотира нигоҳ мешавад)
// ═══════════════════════════════════════════════════════
const { defaults } = require("./config");

// Танзимоти ҷорӣ — аз defaults оғоз мешавад
const cfg = { ...defaults };

// Вақти охирин ҷавоби автоматӣ барои ҳар корбар
const lastReplied = new Map();   // userId → timestamp

// Чатҳои хомӯш (соҳиб ҷавоб дод → бот мехобад)
const silenced    = new Map();   // userId → timestamp (то кай хомӯш)

// Паёми менюи ҷорӣ (барои edit кардан)
let menuState = { chatId: null, msgId: null };

module.exports = { cfg, lastReplied, silenced, menuState };
