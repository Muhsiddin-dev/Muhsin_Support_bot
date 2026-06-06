// ═══════════════════════════════════════════════════════
//  config.js — ҳамаи танзимот инҷо аст
// ═══════════════════════════════════════════════════════

module.exports = {
    // Telegram API
    apiId: parseInt(process.env.API_ID),
    apiHash: process.env.API_HASH,
    session: process.env.SESSION_STRING || "",

    // Танзимоти пешфарз
    defaults: {
        autoReply: true,
        typingAnim: true,
        reactionEnabled: true,
        reactionEmoji: "🤝",
        cooldownMs: 2 * 60 * 1000,       // 2 дақиқа байни ҷавобҳои автоматӣ
        silenceMs: 20 * 60 * 1000,      // 20 дақиқа хомӯшӣ баъди паёми охирини СУҲБАТИ ТУ
    },

    // Матни ҷавоби автоматӣ ({name} — номи фиристанда)
    replyText:
        "Салом, {name} 👋\n\n" +
        "Ман ҳозир дастрас нестам 🪫\n" +
        "Паёматонро хондам — вақте онлайн шавам ҳатман ҷавоб медиҳам 🍻",
};
