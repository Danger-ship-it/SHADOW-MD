require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN not found');
    process.exit(1);
}

const bot = new TelegramBot(token);
const app = express();
const startTime = Date.now();

app.use(express.json());

// Webhook endpoint
app.post(`/webhook/${token}`, (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Health check
app.get('/', (req, res) => {
    res.send('SHADOW MD Bot is running!');
});

// ============================================
// FORCE SUBSCRIBE CONFIGURATION
// ============================================

const verifiedUsers = new Map();

const REQUIRED_CHANNELS = [
    {
        id: '@shadowvoetex',
        name: 'SHADOW VOETEX',
        link: 'https://t.me/shadowvoetex',
        type: 'group'
    }
];

async function isUserSubscribed(userId) {
    try {
        for (const channel of REQUIRED_CHANNELS) {
            const chatMember = await bot.getChatMember(channel.id, userId);
            const status = chatMember.status;
            if (!['member', 'administrator', 'creator'].includes(status)) {
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error checking subscription:', error.message);
        return false;
    }
}

function getForceSubscribeMessage() {
    let message = `╔════════════════════════════════════════╗
║     🔒 ACCESS RESTRICTED 🔒              ║
╠════════════════════════════════════════╣
║  To use SHADOW MD Bot, you MUST join:  ║
║                                        ║
`;
    
    REQUIRED_CHANNELS.forEach((channel, index) => {
        message += `║  ${index + 1}. ${channel.name}\n`;
    });
    
    message += `║                                        ║
║  👇 Click the button below to join     ║
║                                        ║
║  After joining, click:                 ║
║  ✅ "I HAVE JOINED" to verify           ║
╠════════════════════════════════════════╣
║  ⚠️ This bot only works for            ║
║     subscribers of our group!          ║
╚════════════════════════════════════════╝`;

    return message;
}

function getForceSubscribeKeyboard() {
    const keyboard = [];
    REQUIRED_CHANNELS.forEach((channel) => {
        keyboard.push([{ text: `📢 JOIN ${channel.name}`, url: channel.link }]);
    });
    keyboard.push([{ text: "✅ I HAVE JOINED", callback_data: "verify_subscription" }]);
    return { reply_markup: { inline_keyboard: keyboard } };
}

async function checkSubscription(msg) {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    if (verifiedUsers.get(userId)) {
        const isStillSubscribed = await isUserSubscribed(userId);
        if (isStillSubscribed) return true;
        else verifiedUsers.delete(userId);
    }
    
    const isSubscribed = await isUserSubscribed(userId);
    if (isSubscribed) {
        verifiedUsers.set(userId, true);
        return true;
    } else {
        const forceMessage = getForceSubscribeMessage();
        const keyboard = getForceSubscribeKeyboard();
        await bot.sendMessage(chatId, forceMessage, { parseMode: 'Markdown', ...keyboard });
        return false;
    }
}

// Helper functions
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getUptime() {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

// ============================================
// START COMMAND
// ============================================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const name = msg.from.first_name;
    
    const isSubscribed = await isUserSubscribed(userId);
    
    if (isSubscribed) {
        verifiedUsers.set(userId, true);
        
        const welcomeMessage = `╔══════════════════════════════╗
║        🤖 SHADOW MD          ║
║    YOUR ULTIMATE TELEGRAM BOT
╠══════════════════════════════╣
║  👋 WELCOME ${name.toUpperCase()}!
║  ✅ SUBSCRIPTION VERIFIED
║  TYPE /help TO GET STARTED
╚══════════════════════════════╝`;

        const options = {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "📚 HELP", callback_data: "help" }, { text: "ℹ️ ABOUT", callback_data: "about" }],
                    [{ text: "⚽ FOOTBALL", callback_data: "football" }, { text: "🎮 GAMES", callback_data: "games" }],
                    [{ text: "🛠️ TOOLS", callback_data: "tools" }, { text: "🎬 MOVIE", callback_data: "movie" }],
                    [{ text: "🎵 SONG", callback_data: "song" }, { text: "📝 REPORT", callback_data: "report" }]
                ]
            }
        };
        
        await bot.sendMessage(chatId, welcomeMessage, { parseMode: 'Markdown', ...options });
    } else {
        verifiedUsers.delete(userId);
        const forceMessage = getForceSubscribeMessage();
        const keyboard = getForceSubscribeKeyboard();
        await bot.sendMessage(chatId, forceMessage, { parseMode: 'Markdown', ...keyboard });
    }
});

// ============================================
// HELP COMMAND
// ============================================
bot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const helpMessage = `╔════════════════════════════════════════╗
║         🤖 SHADOW MD COMMANDS          ║
╠════════════════════════════════════════╣
║  ⚽ *FOOTBALL COMMANDS:*               ║
║  /eplstandings - EPL Table            ║
║  /eplmatches - EPL Matches            ║
║  /eplscorers - EPL Top Scorers        ║
║  /laligastandings - La Liga Table     ║
║  /serieastandings - Serie A Table     ║
║  /clstandings - UCL Table             ║
║                                        ║
║  🛠️ *TOOLS:*                           ║
║  /qrcode <text> - Generate QR         ║
║  /tinyurl <url> - Shorten URL         ║
║  /genpass - Generate Password         ║
║  /calculate <exp> - Calculate         ║
║  /sticker - Sticker to Image          ║
║                                        ║
║  🎮 *GAMES:*                           ║
║  /rps - Rock Paper Scissors           ║
║  /trivia - Trivia Game                ║
║  /number - Guess Number               ║
║  /joke - Random Joke                  ║
║  /8ball <q> - Magic 8-Ball            ║
║                                        ║
║  🎬 *MEDIA:*                           ║
║  /movie <name> - Movie Info           ║
║  /song <name> - Search Song           ║
║                                        ║
║  ℹ️ *INFO:*                            ║
║  /about - About Bot                   ║
║  /uptime - Bot Uptime                 ║
║  /ping - Response Time                ║
║  /whoami - Your Info                  ║
╚════════════════════════════════════════╝`;

    await bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown' });
});

// ============================================
// FOOTBALL COMMANDS (using API-FOOTBALL)
// ============================================

// EPL Standings
bot.onText(/\/eplstandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const response = await axios.get('https://api.football-data.org/v4/competitions/PL/standings', {
            headers: { 'X-Auth-Token': 'YOUR_API_KEY' }
        });
        const standings = response.data.standings[0].table.slice(0, 10);
        let message = `🏆 *PREMIER LEAGUE STANDINGS*\n\n`;
        standings.forEach((team, index) => {
            message += `${index + 1}. ${team.team.name} - ${team.points} pts\n`;
        });
        await bot.sendMessage(chatId, message, { parseMode: 'Markdown' });
    } catch (error) {
        await bot.sendMessage(chatId, "⚠️ Standings: Manchester City (1st), Arsenal (2nd), Liverpool (3rd)");
    }
});

// EPL Matches
bot.onText(/\/eplmatches/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "⚽ *Upcoming EPL Matches:*\n\nArsenal vs Chelsea\nManchester City vs Liverpool\nManchester United vs Tottenham\n\nUse /eplstandings for table", { parseMode: 'Markdown' });
});

// EPL Top Scorers
bot.onText(/\/eplscorers/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "⚽ *EPL Top Scorers:*\n\n1. Erling Haaland - 21 goals\n2. Mohamed Salah - 18 goals\n3. Ollie Watkins - 16 goals", { parseMode: 'Markdown' });
});

// La Liga Standings
bot.onText(/\/laligastandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *LA LIGA STANDINGS*\n\n1. Real Madrid - 75 pts\n2. Barcelona - 70 pts\n3. Girona - 65 pts\n4. Atletico Madrid - 62 pts", { parseMode: 'Markdown' });
});

// Serie A Standings
bot.onText(/\/serieastandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *SERIE A STANDINGS*\n\n1. Inter Milan - 79 pts\n2. AC Milan - 68 pts\n3. Juventus - 62 pts\n4. Bologna - 60 pts", { parseMode: 'Markdown' });
});

// Champions League Standings
bot.onText(/\/clstandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *CHAMPIONS LEAGUE - QUARTERFINALS*\n\nReal Madrid vs Manchester City\nBayern vs Arsenal\nPSG vs Barcelona\nAtletico vs Dortmund", { parseMode: 'Markdown' });
});

// ============================================
// TOOLS COMMANDS
// ============================================

// QR Code Generator
bot.onText(/\/qrcode (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const text = match[1];
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    await bot.sendPhoto(chatId, qrUrl, { caption: `📱 QR Code for: ${text}` });
});

// TinyURL Shortener
bot.onText(/\/tinyurl (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const url = match[1];
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        await bot.sendMessage(chatId, `✅ *Shortened URL:*\n${response.data}`, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, "❌ Failed to shorten URL");
    }
});

// Generate Password
bot.onText(/\/genpass/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await bot.sendMessage(chatId, `🔐 *Generated Password:*\n\`${password}\``, { parseMode: 'Markdown' });
});

// Calculate (alias for calc)
bot.onText(/\/calculate (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const result = Function(`'use strict'; return (${match[1]})`)();
        await bot.sendMessage(chatId, `🧮 \`${match[1]} = ${result}\``, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, '❌ Invalid calculation');
    }
});

// Calculator
bot.onText(/\/calc (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const result = Function(`'use strict'; return (${match[1]})`)();
        await bot.sendMessage(chatId, `🧮 \`${match[1]} = ${result}\``, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, '❌ Invalid calculation');
    }
});

// Sticker to Image
bot.onText(/\/sticker/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "📸 *Send me a sticker*, and I'll convert it to image!", { parseMode: 'Markdown' });
});

bot.on('sticker', async (msg) => {
    const chatId = msg.chat.id;
    const stickerId = msg.sticker.file_id;
    const file = await bot.getFile(stickerId);
    const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    await bot.sendPhoto(chatId, fileUrl, { caption: "✅ Sticker converted to image!" });
});

// ============================================
// GAME COMMANDS
// ============================================

// Rock Paper Scissors
bot.onText(/\/rps/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: "🪨 ROCK", callback_data: "rps_rock" }, { text: "📄 PAPER", callback_data: "rps_paper" }, { text: "✂️ SCISSORS", callback_data: "rps_scissors" }]
            ]
        }
    };
    await bot.sendMessage(chatId, "🎮 *Choose your move!*", { parseMode: 'Markdown', ...options });
});

// Trivia
bot.onText(/\/trivia/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
        const question = response.data.results[0];
        const answers = [...question.incorrect_answers, question.correct_answer];
        for (let i = answers.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [answers[i], answers[j]] = [answers[j], answers[i]];
        }
        
        const buttons = answers.map(answer => ([{ text: answer.substring(0, 30), callback_data: `trivia_${answer === question.correct_answer ? 'correct' : 'wrong'}` }]));
        await bot.sendMessage(chatId, `📚 *TRIVIA*\n\n${question.question}`, { parseMode: 'Markdown', reply_markup: { inline_keyboard: buttons } });
    } catch {
        await bot.sendMessage(chatId, "❌ Could not fetch trivia");
    }
});

// Guess Number Game
let numberGame = new Map();

bot.onText(/\/number/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const secretNumber = getRandomInt(1, 100);
    numberGame.set(userId, { secret: secretNumber, attempts: 0 });
    await bot.sendMessage(chatId, "🔢 *GUESS THE NUMBER!*\n\nI'm thinking of a number between 1 and 100.\nSend your guess!");
});

// Random Joke
bot.onText(/\/joke/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
        await bot.sendMessage(chatId, `😂 *JOKE*\n\n${response.data.setup}\n\n*${response.data.punchline}*`, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, "😂 Why don't scientists trust atoms? Because they make up everything!");
    }
});

// Magic 8-Ball
bot.onText(/\/8ball (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const answers = ["Yes", "No", "Maybe", "Definitely!", "Not likely", "Ask again later"];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await bot.sendMessage(chatId, `🔮 *8-BALL*\n\nQuestion: ${match[1]}\nAnswer: ${answer}`, { parseMode: 'Markdown' });
});

// ============================================
// MOVIE COMMAND
// ============================================
bot.onText(/\/movie (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const movieName = match[1];
    await bot.sendMessage(chatId, `🎬 *SEARCHING FOR:* ${movieName}\n\n🔗 [Search on IMDb](https://www.imdb.com/find?q=${encodeURIComponent(movieName)})\n🔗 [Watch Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(movieName)}+trailer)`, { parseMode: 'Markdown' });
});

// ============================================
// SONG COMMAND
// ============================================
bot.onText(/\/song (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const songName = match[1];
    await bot.sendMessage(chatId, `🎵 *SEARCHING FOR:* ${songName}\n\n🔗 [Listen on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(songName)})\n🔗 [Search on Spotify](https://open.spotify.com/search/${encodeURIComponent(songName)})`, { parseMode: 'Markdown' });
});

// ============================================
// INFO COMMANDS
// ============================================

bot.onText(/\/about/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 3.0 ★           ║
║  👨‍💻 DEVELOPER: @shadowcodemax ║
║  🌐 STATUS: 🟢 ONLINE         ║
║  🎯 FEATURES:                ║
║   • FOOTBALL UPDATES        ║
║   • TOOLS & UTILITIES       ║
║   • GAMES                   ║
║   • MOVIE & MUSIC           ║
╚══════════════════════════════╝`, { parseMode: 'Markdown' });
});

bot.onText(/\/uptime/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `⏱️ *Uptime:* \`${getUptime()}\``, { parseMode: 'Markdown' });
});

bot.onText(/\/ping/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const start = Date.now();
    const sentMsg = await bot.sendMessage(chatId, "Pong! 🏓");
    const responseTime = Date.now() - start;
    await bot.editMessageText(`🏓 Pong!\n⏱️ ${responseTime}ms`, { chat_id: chatId, message_id: sentMsg.message_id });
});

bot.onText(/\/whoami/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const user = msg.from;
    await bot.sendMessage(chatId, `👤 *USER INFO*\n\nName: ${user.first_name}\nID: \`${user.id}\``, { parseMode: 'Markdown' });
});

bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "📝 *REPORT ISSUE*\n\nContact: @shadowcodemax", { parseMode: 'Markdown' });
});

// ============================================
// UTILITY COMMANDS
// ============================================

bot.onText(/\/roll/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const dice = getRandomInt(1, 6);
    await bot.sendMessage(chatId, `🎲 You rolled: ${dice}`);
});
bot.onText(/\/flip/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '👑' : '🪙';
    await bot.sendMessage(chatId, `${emoji} Coin flip: *${result}*`, { parseMode: 'Markdown' });
});

bot.onText(/\/time/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const now = new Date();
    await bot.sendMessage(chatId, `📅 ${now.toLocaleDateString()}\n🕐 ${now.toLocaleTimeString()}`);
});

bot.onText(/\/quote/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const quotes = [
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Stay hungry, stay foolish. - Steve Jobs",
        "Be the change you wish to see in the world. - Gandhi"
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    await bot.sendMessage(chatId, `💭 ${quote}`);
});
// ============================================
// CALLBACK QUERY HANDLER
// ============================================
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const data = callbackQuery.data;
    
    await bot.answerCallbackQuery(callbackQuery.id);
    
    switch(data) {
        case 'verify_subscription':
            const userId = callbackQuery.from.id;
            const isSubscribed = await isUserSubscribed(userId);
            if (isSubscribed) {
                verifiedUsers.set(userId, true);
                await bot.editMessageText("✅ *VERIFIED!* Welcome to SHADOW MD Bot!\n\nType /help to get started.", {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown'
                });
            } else {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: "❌ Please join @shadowvoetex first!",
                    show_alert: true
                });
            }
            break;
            
        case 'help':
            // FIXED: Directly send help message instead of emitting
            const helpMessage = `╔════════════════════════════════════════╗
║         🤖 SHADOW MD COMMANDS          ║
╠════════════════════════════════════════╣
║  ⚽ *FOOTBALL COMMANDS:*               ║
║  /eplstandings - EPL Table            ║
║  /eplmatches - EPL Matches            ║
║  /eplscorers - EPL Top Scorers        ║
║  /laligastandings - La Liga Table     ║
║  /serieastandings - Serie A Table     ║
║  /clstandings - UCL Table             ║
║                                        ║
║  🛠️ *TOOLS:*                           ║
║  /qrcode <text> - Generate QR         ║
║  /tinyurl <url> - Shorten URL         ║
║  /genpass - Generate Password         ║
║  /calculate <exp> - Calculate         ║
║  /sticker - Sticker to Image          ║
║                                        ║
║  🎮 *GAMES:*                           ║
║  /rps - Rock Paper Scissors           ║
║  /trivia - Trivia Game                ║
║  /number - Guess Number               ║
║  /joke - Random Joke                  ║
║  /8ball <q> - Magic 8-Ball            ║
║                                        ║
║  🎬 *MEDIA:*                           ║
║  /movie <name> - Movie Info           ║
║  /song <name> - Search Song           ║
║                                        ║
║  ℹ️ *INFO:*                            ║
║  /about - About Bot                   ║
║  /uptime - Bot Uptime                 ║
║  /ping - Response Time                ║
║  /whoami - Your Info                  ║
╚════════════════════════════════════════╝`;
            
            await bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown' });
            break;
            
        case 'about':
            // FIXED: Directly send about message
            const aboutMessage = `╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 3.0 ★           ║
║  👨‍💻 DEVELOPER: @shadowcodemax ║
║  🌐 STATUS: 🟢 ONLINE         ║
║  🎯 FEATURES:                ║
║   • FOOTBALL UPDATES        ║
║   • TOOLS & UTILITIES       ║
║   • GAMES                   ║
║   • MOVIE & MUSIC           ║
╚══════════════════════════════╝`;
            
            await bot.sendMessage(chatId, aboutMessage, { parseMode: 'Markdown' });
            break;
            
        case 'report':
            // FIXED: Directly send report message
            await bot.sendMessage(chatId, "📝 *REPORT ISSUE*\n\nContact: @shadowcodemax", { parseMode: 'Markdown' });
            break;
            
        case 'football':
            await bot.sendMessage(chatId, "⚽ *FOOTBALL COMMANDS*\n\n/eplstandings\n/eplmatches\n/eplscorers\n/laligastandings\n/serieastandings\n/clstandings", { parseMode: 'Markdown' });
            break;
            
        case 'games':
            await bot.sendMessage(chatId, "🎮 *GAMES*\n\n/rps\n/trivia\n/number\n/joke\n/8ball <question>", { parseMode: 'Markdown' });
            break;
            
        case 'tools':
            await bot.sendMessage(chatId, "🛠️ *TOOLS*\n\n/qrcode <text>\n/tinyurl <url>\n/genpass\n/calculate <exp>\n/sticker", { parseMode: 'Markdown' });
            break;
            
        case 'movie':
            await bot.sendMessage(chatId, "🎬 Send: `/movie <name>`", { parseMode: 'Markdown' });
            break;
            
        case 'song':
            await bot.sendMessage(chatId, "🎵 Send: `/song <name>`", { parseMode: 'Markdown' });
            break;
            
        case 'rps_rock':
        case 'rps_paper':
        case 'rps_scissors':
            const userChoice = data.split('_')[1];
            const botChoice = ['rock', 'paper', 'scissors'][Math.floor(Math.random() * 3)];
            let result;
            if (userChoice === botChoice) result = "Tie! 🤝";
            else if ((userChoice === 'rock' && botChoice === 'scissors') ||
                     (userChoice === 'paper' && botChoice === 'rock') ||
                     (userChoice === 'scissors' && botChoice === 'paper')) result = "You win! 🎉";
            else result = "You lose! 😢";
            await bot.editMessageText(`🎮 *RPS*\n\nYou: ${userChoice}\nBot: ${botChoice}\n\n${result}`, {
                chat_id: chatId,
                message_id: message.message_id,
                parseMode: 'Markdown'
            });
            break;
            
        case 'trivia_correct':
            await bot.editMessageText("✅ *CORRECT!* Well done! 🎉", {
                chat_id: chatId,
                message_id: message.message_id,
                parseMode: 'Markdown'
            });
            break;
            
        case 'trivia_wrong':
            await bot.editMessageText("❌ *WRONG!* Better luck next time!", {
                chat_id: chatId,
                message_id: message.message_id,
                parseMode: 'Markdown'
            });
            break;
            
        default:
            await bot.sendMessage(chatId, "❌ Command not recognized. Use /help for available commands.");
    }
});
// ============================================
// NUMBER GUESS HANDLER
// ============================================
bot.onText(/^(\d+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const guess = parseInt(match[1]);
    
    if (!numberGame.has(userId)) return;
    
    const game = numberGame.get(userId);
    game.attempts++;
    
    if (guess === game.secret) {
        numberGame.delete(userId);
        await bot.sendMessage(chatId, `🎉 *CORRECT!* The number was ${game.secret}!\nAttempts: ${game.attempts}`, { parseMode: 'Markdown' });
    } else if (guess < game.secret) {
        await bot.sendMessage(chatId, `📈 Too low! (Attempts: ${game.attempts})`);
    } else {
        await bot.sendMessage(chatId, `📉 Too high! (Attempts: ${game.attempts})`);
    }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 SHADOW MD Bot running on port ${PORT}`);
    
    const webhookUrl = `https://shadow-md-incredible-creativity.up.railway.app/webhook/${token}`;
    try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});