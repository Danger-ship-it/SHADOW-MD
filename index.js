require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs');
const path = require('path');

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

// Health check endpoint
app.get('/', (req, res) => {
    res.send('SHADOW MD Bot is running!');
});

// ============================================
// FORCE SUBSCRIBE CONFIGURATION
// ============================================

// Store user verification status (cached)
const verifiedUsers = new Map(); // userId -> boolean

// Required channels/groups (update with your actual links)
const REQUIRED_CHANNELS = [
    {
        id: '@shadowvoetex',  // Your Telegram group username
        name: 'SHADOW VOETEX',
        link: 'https://t.me/shadowvoetex',
        type: 'group'
    }
];

// Check if user is subscribed to all required channels
async function isUserSubscribed(userId) {
    try {
        for (const channel of REQUIRED_CHANNELS) {
            const chatMember = await bot.getChatMember(channel.id, userId);
            const status = chatMember.status;
            
            // Valid statuses: 'member', 'administrator', 'creator'
            if (!['member', 'administrator', 'creator'].includes(status)) {
                console.log(`User ${userId} not subscribed to ${channel.name}`);
                return false;
            }
        }
        return true;
    } catch (error) {
        console.error('Error checking subscription:', error.message);
        return false;
    }
}

// Generate force subscribe message
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

// Create inline keyboard for force subscribe
function getForceSubscribeKeyboard() {
    const keyboard = [];
    
    REQUIRED_CHANNELS.forEach((channel) => {
        keyboard.push([{ text: `📢 JOIN ${channel.name}`, url: channel.link }]);
    });
    
    keyboard.push([{ text: "✅ I HAVE JOINED", callback_data: "verify_subscription" }]);
    
    return {
        reply_markup: {
            inline_keyboard: keyboard
        }
    };
}

// Helper function for random number
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Format uptime
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

// Download music function
async function downloadMusic(songName, chatId) {
    try {
        const ytSearch = require('yt-search');
        const searchResults = await ytSearch(songName + " song");
        
        if (!searchResults || searchResults.videos.length === 0) {
            return null;
        }
        
        const video = searchResults.videos[0];
        const videoUrl = video.url;
        
        const audioPath = path.join(__dirname, `song_${Date.now()}.mp3`);
        
        const stream = ytdl(videoUrl, {
            filter: 'audioonly',
            quality: 'highestaudio'
        });
        
        const writeStream = fs.createWriteStream(audioPath);
        
        return new Promise((resolve, reject) => {
            stream.pipe(writeStream);
            
            writeStream.on('finish', () => {
                resolve({
                    path: audioPath,
                    title: video.title,
                    duration: video.duration,
                    url: videoUrl
                });
            });
            
            writeStream.on('error', reject);
            stream.on('error', reject);
        });
    } catch (error) {
        console.error('Download error:', error);
        return null;
    }
}

// ============================================
// MIDDLEWARE: Check subscription before commands
// ============================================
async function checkSubscription(msg) {
    const userId = msg.from.id;
    const chatId = msg.chat.id;
    
    // Check if user is verified
    if (verifiedUsers.get(userId)) {
        const isStillSubscribed = await isUserSubscribed(userId);
        if (isStillSubscribed) {
            return true;
        } else {
            verifiedUsers.delete(userId);
        }
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

// ============================================
// START COMMAND WITH FORCE SUBSCRIBE
// ============================================
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const name = msg.from.first_name;
    
    // Check subscription
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
                    [
                        { text: "📚 HELP", callback_data: "help" },
                        { text: "ℹ️ ABOUT", callback_data: "about" }
                    ],
                    [
                        { text: "🎬 MOVIE", callback_data: "movie" },
                        { text: "🎵 SONG", callback_data: "song" }
                    ],
                    [
                        { text: "⏱️ UPTIME", callback_data: "uptime" },
                        { text: "👤 WHOAMI", callback_data: "whoami" }
                    ],
                    [
                        { text: "🎲 ROLL", callback_data: "roll" },
                        { text: "🪙 FLIP", callback_data: "flip" }
                    ],
                    [
                        { text: "📅 TIME", callback_data: "time" },
                        { text: "💭 QUOTE", callback_data: "quote" }
                    ],
                    [
                        { text: "🎮 GAMES", callback_data: "games" },
                        { text: "📝 REPORT", callback_data: "report" }
                    ],
                    [
                        { text: "🏓 PING", callback_data: "ping" }
                    ]
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
║  🎬 *MOVIE & MUSIC COMMANDS:*          ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /movie <name> - FIND MOVIE            ║
║  /song <name> - DOWNLOAD SONG          ║
║                                        ║
║  🎮 *FUN & GAMES:*                     ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /roll - ROLL A DICE                   ║
║  /flip - FLIP A COIN                   ║
║  /random <min> <max> - RANDOM NUMBER   ║
║  /quote - RANDOM QUOTE                 ║
║  /hello - GET A GREETING               ║
║  /rps - ROCK PAPER SCISSORS            ║
║  /trivia - TRIVIA QUESTION             ║
║  /number - GUESS THE NUMBER            ║
║  /joke - RANDOM JOKE                   ║
║  /fact - RANDOM FACT                   ║
║  /advice - RANDOM ADVICE               ║
║  /8ball - MAGIC 8-BALL                 ║
║                                        ║
║  🔧 *UTILITY COMMANDS:*                ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /time - CURRENT DATE & TIME           ║
║  /uptime - BOT UPTIME                  ║
║  /echo <msg> - REPEAT MESSAGE          ║
║  /calc <exp> - CALCULATE MATH          ║
║  /remind <sec> <msg> - SET REMINDER    ║
║                                        ║
║  ℹ️ *INFO COMMANDS:*                   ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /about - ABOUT SHADOW MD              ║
║  /whoami - YOUR USER INFO              ║
║  /chatid - GET CHAT ID                 ║
║  /ping - CHECK RESPONSE TIME           ║
╚════════════════════════════════════════╝`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "ℹ️ ABOUT", callback_data: "about" }
                ],
                [
                    { text: "🎬 MOVIE", callback_data: "movie" },
                    { text: "🎵 SONG", callback_data: "song" }
                ],
                [
                    { text: "🎮 GAMES", callback_data: "games" },
                    { text: "📝 REPORT", callback_data: "report" }
                ],
                [
                    { text: "⏱️ UPTIME", callback_data: "uptime" },
                    { text: "👤 WHOAMI", callback_data: "whoami" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown', ...options });
});

// ============================================
// ABOUT COMMAND
// ============================================
bot.onText(/\/about/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const aboutMessage = `╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 2.0 ★           ║
║  👨‍💻 DEVELOPER: @shadowcodemax ║
║  🌐 STATUS: 🟢 ONLINE         ║
║  🎯 PURPOSE: MULTI-UTILITY    ║
║      TELEGRAM BOT            ║
║  🛠️ FEATURES:                ║
║   • MUSIC DOWNLOAD           ║
║   • MOVIE FINDER             ║
║   • GAMES & UTILITIES        ║
║   • REMINDERS & MORE         ║
╚══════════════════════════════╝`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, aboutMessage, { parseMode: 'Markdown', ...options });
});

// ============================================
// REPORT COMMAND
// ============================================
bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const message = `╔══════════════════════════════╗
║       📝 REPORT ISSUE        ║
╠══════════════════════════════╣
║  TO REPORT AN ISSUE:        ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  CONTACT DEVELOPER:         ║
║  @shadowcodemax              ║
║                             ║
║  WE'LL RESPOND WITHIN 24H   ║
╚══════════════════════════════╝`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, message, { parseMode: 'Markdown', ...options });
});

// ============================================
// UPTIME COMMAND
// ============================================
bot.onText(/\/uptime/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const uptime = getUptime();
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, `⏱️ *SHADOW MD Uptime:* \`${uptime}\``, { parseMode: 'Markdown', ...options });
});

// ============================================
// WHOAMI COMMAND
// ============================================
bot.onText(/\/whoami/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const user = msg.from;
    const info = `╔══════════════════════════════╗
║       👤 USER INFORMATION     ║
╠══════════════════════════════╣
║  📛 NAME: ${user.first_name} ${user.last_name || ''}
║  🔖 USERNAME: ${user.username ? '@' + user.username : 'Not set'}
║  🆔 USER ID: \`${user.id}\`
║  🌐 LANGUAGE: ${user.language_code || 'Unknown'}
║  💬 CHAT TYPE: ${msg.chat.type}
╚══════════════════════════════╝`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, info, { parseMode: 'Markdown', ...options });
});

// ============================================
// CHATID COMMAND
// ============================================
bot.onText(/\/chatid/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `🆔 Chat ID: \`${msg.chat.id}\``, { parseMode: 'Markdown', ...options });
});

// ============================================
// HELLO COMMAND
// ============================================
bot.onText(/\/hello/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const greetings = ['Hello', 'Hi', 'Hey', "What's up", 'Greetings'];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `${randomGreeting} ${msg.from.first_name}! 👋`, { ...options });
});

// ============================================
// TIME COMMAND
// ============================================
bot.onText(/\/time/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const now = new Date();
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `📅 ${now.toLocaleDateString()}\n🕐 ${now.toLocaleTimeString()}`, { ...options });
});

// ============================================
// ECHO COMMAND
// ============================================
bot.onText(/\/echo (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `🔊 ${match[1]}`, { ...options });
});

// ============================================
// CALCULATOR COMMAND
// ============================================
bot.onText(/\/calc (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const result = Function(`'use strict'; return (${match[1]})`)();
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🏠 HOME", callback_data: "start" },
                        { text: "📚 HELP", callback_data: "help" }
                    ]
                ]
            }
        };
        await bot.sendMessage(chatId, `🧮 \`${match[1]} = ${result}\``, { parseMode: 'Markdown', ...options });
    } catch {
        await bot.sendMessage(chatId, '❌ Invalid calculation');
    }
});

// ============================================
// ROLL COMMAND
// ============================================
bot.onText(/\/roll/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const dice = getRandomInt(1, 6);
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🎲 ROLL AGAIN", callback_data: "roll" },
                    { text: "🏠 HOME", callback_data: "start" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `🎲 You rolled a ${dice} ${diceEmojis[dice-1]}`, { ...options });
});

// ============================================
// FLIP COMMAND
// ============================================
bot.onText(/\/flip/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '👑' : '🪙';
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🪙 FLIP AGAIN", callback_data: "flip" },
                    { text: "🏠 HOME", callback_data: "start" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `${emoji} Coin flip: *${result}!*`, { parseMode: 'Markdown', ...options });
});

// ============================================
// RANDOM COMMAND
// ============================================
bot.onText(/\/random (\d+) (\d+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    let min = parseInt(match[1]);
    let max = parseInt(match[2]);
    if (min > max) [min, max] = [max, min];
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `🎲 Random: *${getRandomInt(min, max)}*`, { parseMode: 'Markdown', ...options });
});

// ============================================
// QUOTE COMMAND
// ============================================
bot.onText(/\/quote/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const quotes = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
        { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" }
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "💭 ANOTHER QUOTE", callback_data: "quote" },
                    { text: "🏠 HOME", callback_data: "start" }
                ]
            ]
        }
    };
    await bot.sendMessage(chatId, `💭 *"${quote.text}"*\n\n— ${quote.author}`, { parseMode: 'Markdown', ...options });
});

// ============================================
// REMINDER COMMAND
// ============================================
bot.onText(/\/remind (\d+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const seconds = parseInt(match[1]);
    const reminderText = match[2];
    if (seconds <= 0 || seconds > 3600) {
        await bot.sendMessage(chatId, '❌ Set reminder between 1-3600 seconds');
        return;
    }
    await bot.sendMessage(chatId, `⏰ Reminder in ${seconds} seconds: "${reminderText}"`);
    setTimeout(async () => {
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🏠 HOME", callback_data: "start" },
                        { text: "📚 HELP", callback_data: "help" }
                    ]
                ]
            }
        };
        await bot.sendMessage(chatId, `🔔 *REMINDER*: ${reminderText}`, { parseMode: 'Markdown', ...options });
    }, seconds * 1000);
});

// ============================================
// MOVIE COMMAND
// ============================================
bot.onText(/\/movie (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const movieName = match[1];
    
    const loadingMsg = await bot.sendMessage(chatId, `🎬 Searching for "*${movieName}*"... Please wait.`, { parseMode: 'Markdown' });
    
    try {
        const tmdbUrl = `https://api.themoviedb.org/3/search/movie?api_key=15d2ea6d0dc1d476efbca3eba2b9bbfb&query=${encodeURIComponent(movieName)}`;
        const response = await axios.get(tmdbUrl);
        
        if (response.data.results && response.data.results.length > 0) {
            const movie = response.data.results[0];
            
            let message = `🎬 *${movie.title}* (${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'})\n`;
            message += `⭐ Rating: ${movie.vote_average}/10\n`;
            message += `📝 ${movie.overview.substring(0, 300)}...\n\n`;
            message += `*Where to watch:*\n`;
            message += `🔗 [JustWatch](https://www.justwatch.com/us/search?q=${encodeURIComponent(movie.title)})\n`;
            message += `🔗 [IMDb](https://www.imdb.com/find?q=${encodeURIComponent(movie.title)})\n`;
            message += `🔗 [YouTube Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title)}+trailer)\n\n`;
            message += `*Download Links:*\n`;
            message += `📥 [YTS](https://yts.mx/search?q=${encodeURIComponent(movie.title)})\n`;
            message += `📥 [ThePirateBay](https://thepiratebay.org/search.php?q=${encodeURIComponent(movie.title)})\n`;
            message += `📥 [1337x](https://1337x.to/search/${encodeURIComponent(movie.title)}/1/)\n`;
            
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🎵 SEARCH SONG", callback_data: "song_prompt" },
                            { text: "🏠 HOME", callback_data: "start" }
                        ]
                    ]
                }
            };
            
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parseMode: 'Markdown',
                disable_web_page_preview: true,
                ...options
            });
        } else {
            const fallbackMessage = `❌ No results found for "*${movieName}*".\n\n🔍 Try searching here:\n🔗 [Google](https://www.google.com/search?q=${encodeURIComponent(movieName)}+movie)\n🔗 [YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(movieName)}+movie)\n🔗 [IMDb](https://www.imdb.com/find?q=${encodeURIComponent(movieName)})`;
            
            await bot.editMessageText(fallbackMessage, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parseMode: 'Markdown',
                disable_web_page_preview: true
            });
        }
    } catch (error) {
        console.error('Movie search error:', error.message);
        
        const errorMessage = `❌ Error searching for "*${movieName}*".\n\n🔍 Try these links:\n🔗 [Google Search](https://www.google.com/search?q=${encodeURIComponent(movieName)}+movie+download)\n🔗 [YouTube Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(movieName)}+trailer)\n🔗 [IMDb Page](https://www.imdb.com/find?q=${encodeURIComponent(movieName)})\n\n📌 Tip: Try a different movie name!`;
        
        await bot.editMessageText(errorMessage, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parseMode: 'Markdown',
            disable_web_page_preview: true
        });
    }
});

// ============================================
// SONG COMMAND
// ============================================
bot.onText(/\/song (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const songName = match[1];
    
    const loadingMsg = await bot.sendMessage(chatId, `🎵 Searching for "*${songName}*"... Please wait.`, { parseMode: 'Markdown' });
    
    try {
        const ytSearch = require('yt-search');
        const searchResults = await ytSearch(songName + " official audio song");
        
        if (searchResults && searchResults.videos && searchResults.videos.length > 0) {
            const videos = searchResults.videos.slice(0, 5);
            
            let message = `🎵 *Search results for "${songName}":*\n\n`;
            
            videos.forEach((video, index) => {
                const duration = video.duration.timestamp || 'N/A';
                const views = video.views ? video.views.toLocaleString() : 'N/A';
                message += `${index + 1}. *${video.title.substring(0, 60)}*\n`;
                message += `   ⏱️ ${duration} | 👁️ ${views} views\n`;
                message += `   🔗 [Click to Listen](${video.url})\n\n`;
            });
            
            message += `📌 *How to download:*\n`;
            message += `1. Click any link above to open YouTube\n`;
            message += `2. Use a YouTube to MP3 converter\n`;
            message += `3. Or search: "${songName} download mp3"`;
            
            const options = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🎬 SEARCH MOVIE", callback_data: "movie_prompt" },
                            { text: "🏠 HOME", callback_data: "start" }
                        ],
                        [
                            { text: "🎵 SEARCH ANOTHER SONG", callback_data: "song_prompt" }
                        ]
                    ]
                }
            };
            
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parseMode: 'Markdown',
                disable_web_page_preview: false,
                ...options
            });
        } else {
            await bot.editMessageText(`❌ No results found for "*${songName}*".\n\nTry:\n🔗 [Search on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(songName)})`, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parseMode: 'Markdown',
                disable_web_page_preview: true
            });
        }
    } catch (error) {
        console.error('Song search error:', error);
        await bot.editMessageText(`❌ Error searching for "*${songName}*".\n\n🔗 [Search directly on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(songName)})`, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parseMode: 'Markdown',
            disable_web_page_preview: true
        });
    }
});

// ============================================
// PING COMMAND
// ============================================
bot.onText(/\/ping/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const start = Date.now();
    
    const sentMsg = await bot.sendMessage(chatId, 'Pong! 🏓');
    const responseTime = Date.now() - start;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" },
                    { text: "📚 HELP", callback_data: "help" }
                ]
            ]
        }
    };
    
    await bot.editMessageText(`🏓 Pong!\n⏱️ Response time: ${responseTime}ms`, {
        chat_id: chatId,
        message_id: sentMsg.message_id,
        parseMode: 'Markdown',
        ...options
    });
});

// ============================================
// GAME COMMANDS
// ============================================

// Rock Paper Scissors Game
bot.onText(/\/rps/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🪨 ROCK", callback_data: "rps_rock" },
                    { text: "📄 PAPER", callback_data: "rps_paper" },
                    { text: "✂️ SCISSORS", callback_data: "rps_scissors" }
                ],
                [
                    { text: "🏠 HOME", callback_data: "start" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, "🎮 *Choose your move!*", { parseMode: 'Markdown', ...options });
});

// Trivia Game
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
        buttons.push([{ text: "🏠 HOME", callback_data: "start" }]);
        
        const options = {
            reply_markup: {
                inline_keyboard: buttons
            }
        };
        
        await bot.sendMessage(chatId, `📚 *TRIVIA QUESTION*\n\n${question.question}\n\nCategory: ${question.category}\nDifficulty: ${question.difficulty}`, { parseMode: 'Markdown', ...options });
    } catch (error) {
        await bot.sendMessage(chatId, "❌ Could not fetch trivia. Try again later!");
    }
});

// Guess the Number Game
let numberGame = new Map();

bot.onText(/\/number/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const secretNumber = getRandomInt(1, 100);
    numberGame.set(userId, { secret: secretNumber, attempts: 0 });
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🏠 HOME", callback_data: "start" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, "🔢 *GUESS THE NUMBER!*\n\nI'm thinking of a number between 1 and 100.\nType your guess as a number!\nExample: `50`", { parseMode: 'Markdown', ...options });
});

// Handle number guesses
bot.onText(/^(\d+)$/, async (msg, match) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const guess = parseInt(match[1]);
    
    if (!numberGame.has(userId)) return;
    
    const game = numberGame.get(userId);
    game.attempts++;
    
    if (guess === game.secret) {
        numberGame.delete(userId);
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "🎮 PLAY AGAIN", callback_data: "number" },
                        { text: "🏠 HOME", callback_data: "start" }
                    ]
                ]
            }
        };
        await bot.sendMessage(chatId, `🎉 *CORRECT!* 🎉\n\nThe number was ${game.secret}!\nYou guessed it in ${game.attempts} attempts!`, { parseMode: 'Markdown', ...options });
    } else if (guess < game.secret) {
        await bot.sendMessage(chatId, `📈 Too low! Try again. (Attempts: ${game.attempts})`);
    } else {
        await bot.sendMessage(chatId, `📉 Too high! Try again. (Attempts: ${game.attempts})`);
    }
});

// Random Joke
bot.onText(/\/joke/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
        const joke = response.data;
        
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "😂 ANOTHER JOKE", callback_data: "joke" },
                        { text: "🏠 HOME", callback_data: "start" }
                    ]
                ]
            }
        };
        
        await bot.sendMessage(chatId, `🎭 *JOKE TIME!*\n\n${joke.setup}\n\n*${joke.punchline}*`, { parseMode: 'Markdown', ...options });
    } catch (error) {
        await bot.sendMessage(chatId, "❌ Could not fetch joke. Try again!");
    }
});

// Random Fact
bot.onText(/\/fact/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
        const fact = response.data.text;
        
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "📖 ANOTHER FACT", callback_data: "fact" },
                        { text: "🏠 HOME", callback_data: "start" }
                    ]
                ]
            }
        };
        
        await bot.sendMessage(chatId, `📖 *RANDOM FACT*\n\n${fact}`, { parseMode: 'Markdown', ...options });
    } catch (error) {
        await bot.sendMessage(chatId, "❌ Could not fetch fact. Try again!");
    }
});

// Random Advice
bot.onText(/\/advice/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const response = await axios.get('https://api.adviceslip.com/advice');
        const advice = response.data.slip.advice;
        
        const options = {
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: "💡 MORE ADVICE", callback_data: "advice" },
                        { text: "🏠 HOME", callback_data: "start" }
                    ]
                ]
            }
        };
        
        await bot.sendMessage(chatId, `💡 *ADVICE*\n\n"${advice}"`, { parseMode: 'Markdown', ...options });
    } catch (error) {
        await bot.sendMessage(chatId, "❌ Could not fetch advice. Try again!");
    }
});

// Magic 8-Ball
const eightBallResponses = [
    "Yes, definitely!", "It is certain.", "Without a doubt.", "Most likely.",
    "Signs point to yes.", "Reply hazy, try again.", "Ask again later.",
    "Better not tell you now.", "Cannot predict now.", "Don't count on it.",
    "My reply is no.", "My sources say no.", "Outlook not so good.", "Very doubtful."
];

bot.onText(/\/8ball (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const question = match[1];
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const answer = eightBallResponses[Math.floor(Math.random() * eightBallResponses.length)];
    
    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    { text: "🔮 ASK ANOTHER", callback_data: "eightball_prompt" },
                    { text: "🏠 HOME", callback_data: "start" }
                ]
            ]
        }
    };
    
    await bot.sendMessage(chatId, `🔮 *MAGIC 8-BALL*\n\nQuestion: ${question}\n\nAnswer: ${answer}`, { parseMode: 'Markdown', ...options });
});

bot.onText(/\/8ball/, async (msg) => {
    const chatId = msg.chat.id;
    
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🔮 *Ask the Magic 8-Ball a question!*\nExample: `/8ball Will I win today?`", { parseMode: 'Markdown' });
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
                await bot.editMessageText(`✅ *SUBSCRIPTION VERIFIED!*\n\nWelcome to SHADOW MD Bot! Type /help to get started.`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown'
                });
                
                const name = callbackQuery.from.first_name;
                const welcomeMessage = `╔══════════════════════════════╗
║        🤖 SHADOW MD          ║
║    YOUR ULTIMATE TELEGRAM BOT
╠══════════════════════════════╣
║  👋 WELCOME ${name.toUpperCase()}!
║  TYPE /help TO GET STARTED
╚══════════════════════════════╝`;
                
                const options = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "📚 HELP", callback_data: "help" },
                                { text: "ℹ️ ABOUT", callback_data: "about" }
                            ],
                            [
                                { text: "🎬 MOVIE", callback_data: "movie" },
                                { text: "🎵 SONG", callback_data: "song" }
                            ],
                            [
                                { text: "🎮 GAMES", callback_data: "games" },
                                { text: "📝 REPORT", callback_data: "report" }
                            ]
                        ]
                    }
                };
                
                await bot.sendMessage(chatId, welcomeMessage, { parseMode: 'Markdown', ...options });
            } else {
                await bot.answerCallbackQuery(callbackQuery.id, {
                    text: "❌ You haven't joined the required group yet! Please join @shadowvoetex first.",
                    show_alert: true
                });
            }
            break;
            
        case 'games':
            const gamesMessage = `╔══════════════════════════════╗
║         🎮 GAMES MENU        ║
╠══════════════════════════════╣
║  /rps - ROCK PAPER SCISSORS  ║
║  /trivia - TRIVIA GAME       ║
║  /number - GUESS THE NUMBER  ║
║  /joke - RANDOM JOKE         ║
║  /fact - RANDOM FACT         ║
║  /advice - RANDOM ADVICE     ║
║  /8ball - MAGIC 8-BALL       ║
╚══════════════════════════════╝`;
            
            const gamesOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🎮 PLAY RPS", callback_data: "rps" },
                            { text: "📚 TRIVIA", callback_data: "trivia" }
                        ],
                        [
                            { text: "🔢 NUMBER GUESS", callback_data: "number" },
                            { text: "😂 JOKE", callback_data: "joke" }
                        ],
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "📚 HELP", callback_data: "help" }
                        ]
                    ]
                }
            };
            
            await bot.sendMessage(chatId, gamesMessage, { parseMode: 'Markdown', ...gamesOptions });
            break;
            
        case 'rps':
        case 'rps_rock':
        case 'rps_paper':
        case 'rps_scissors':
            if (data === 'rps') {
                const rpsOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "🪨 ROCK", callback_data: "rps_rock" },
                                { text: "📄 PAPER", callback_data: "rps_paper" },
                                { text: "✂️ SCISSORS", callback_data: "rps_scissors" }
                            ],
                            [
                                { text: "🏠 HOME", callback_data: "start" }
                            ]
                        ]
                    }
                };
                await bot.sendMessage(chatId, "🎮 *Choose your move!*", { parseMode: 'Markdown', ...rpsOptions });
            } else {
                const userChoice = data.split('_')[1];
                const choices = { rock: '🪨', paper: '📄', scissors: '✂️' };
                const botChoices = ['rock', 'paper', 'scissors'];
                const botChoice = botChoices[Math.floor(Math.random() * 3)];
                
                let result;
                if (userChoice === botChoice) {
                    result = "It's a tie! 🤝";
                } else if (
                    (userChoice === 'rock' && botChoice === 'scissors') ||
                    (userChoice === 'paper' && botChoice === 'rock') ||
                    (userChoice === 'scissors' && botChoice === 'paper')
                ) {
                    result = "You win! 🎉";
                } else {
                    result = "You lose! 😢";
                }
                
                const rpsResult = `🎮 *ROCK PAPER SCISSORS*\n\nYou chose: ${choices[userChoice]} ${userChoice}\nBot chose: ${choices[botChoice]} ${botChoice}\n\n*${result}*`;
                
                const playAgainOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "🎮 PLAY AGAIN", callback_data: "rps" },
                                { text: "🏠 HOME", callback_data: "start" }
                            ]
                        ]
                    }
                };
                
                await bot.editMessageText(rpsResult, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown',
                    ...playAgainOptions
                });
            }
            break;
            
        case 'trivia':
            try {
                const response = await axios.get('https://opentdb.com/api.php?amount=1&type=multiple');
                const question = response.data.results[0];
                
                const answers = [...question.incorrect_answers, question.correct_answer];
                for (let i = answers.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [answers[i], answers[j]] = [answers[j], answers[i]];
                }
                
                const buttons = answers.map(answer => ([{ text: answer.substring(0, 30), callback_data: `trivia_${answer === question.correct_answer ? 'correct' : 'wrong'}` }]));
                buttons.push([{ text: "🏠 HOME", callback_data: "start" }]);
                
                const triviaOptions = {
                    reply_markup: {
                        inline_keyboard: buttons
                    }
                };
                
                await bot.editMessageText(`📚 *TRIVIA QUESTION*\n\n${question.question}\n\nCategory: ${question.category}\nDifficulty: ${question.difficulty}`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown',
                    ...triviaOptions
                });
            } catch (error) {
                await bot.editMessageText("❌ Could not fetch trivia. Try again!", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
            }
            break;
            
        case 'trivia_correct':
            await bot.editMessageText("✅ *CORRECT!* Well done! 🎉", {
                chat_id: chatId,
                message_id: message.message_id,
                parseMode: 'Markdown'
            });
            break;
            
        case 'trivia_wrong':
            await bot.editMessageText("❌ *WRONG!* Better luck next time! 😢", {
                chat_id: chatId,
                message_id: message.message_id,
                parseMode: 'Markdown'
            });
            break;
            
        case 'number':
            const secretNumber = getRandomInt(1, 100);
            numberGame.set(callbackQuery.from.id, { secret: secretNumber, attempts: 0 });
            await bot.editMessageText("🔢 *GUESS THE NUMBER!*\n\nI'm thinking of a number between 1 and 100.\nType your guess as a number!\nExample: `50`", {
                chat_id: chatId,
                message_id: message.message_id,
                parseMode: 'Markdown'
            });
            break;
            
        case 'joke':
            try {
                const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
                const joke = response.data;
                const jokeOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "😂 ANOTHER JOKE", callback_data: "joke" },
                                { text: "🏠 HOME", callback_data: "start" }
                            ]
                        ]
                    }
                };
                await bot.editMessageText(`🎭 *JOKE TIME!*\n\n${joke.setup}\n\n*${joke.punchline}*`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown',
                    ...jokeOptions
                });
            } catch (error) {
                await bot.editMessageText("❌ Could not fetch joke. Try again!", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
            }
            break;
            
        case 'fact':
            try {
                const response = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
                const fact = response.data.text;
                const factOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "📖 ANOTHER FACT", callback_data: "fact" },
                                { text: "🏠 HOME", callback_data: "start" }
                            ]
                        ]
                    }
                };
                await bot.editMessageText(`📖 *RANDOM FACT*\n\n${fact}`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown',
                    ...factOptions
                });
            } catch (error) {
                await bot.editMessageText("❌ Could not fetch fact. Try again!", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
            }
            break;
            
        case 'advice':
            try {
                const response = await axios.get('https://api.adviceslip.com/advice');
                const advice = response.data.slip.advice;
                const adviceOptions = {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                { text: "💡 MORE ADVICE", callback_data: "advice" },
                                { text: "🏠 HOME", callback_data: "start" }
                            ]
                        ]
                    }
                };
                await bot.editMessageText(`💡 *ADVICE*\n\n"${advice}"`, {
                    chat_id: chatId,
                    message_id: message.message_id,
                    parseMode: 'Markdown',
                    ...adviceOptions
                });
            } catch (error) {
                await bot.editMessageText("❌ Could not fetch advice. Try again!", {
                    chat_id: chatId,
                    message_id: message.message_id
                });
            }
            break;
            
        case 'eightball_prompt':
            await bot.sendMessage(chatId, "🔮 *Ask the Magic 8-Ball a question!*\nExample: `/8ball Will I win today?`", { parseMode: 'Markdown' });
            break;
            
        case 'start':
        case 'help':
        case 'about':
        case 'movie':
        case 'song':
        case 'uptime':
        case 'whoami':
        case 'roll':
        case 'flip':
        case 'time':
        case 'quote':
        case 'report':
        case 'ping':
        case 'movie_prompt':
        case 'song_prompt':
            bot.emit('text', { chat: { id: chatId }, from: callbackQuery.from, text: `/${data}` });
            break;
            
        default:
            await bot.sendMessage(chatId, "❌ Command not recognized. Use /help for available commands.");
    }
});

// ============================================
// START SERVER WITH WEBHOOK
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 SHADOW MD Bot is running on port ${PORT}`);
    
    const webhookUrl = `https://shadow-md-incredible-creativity.up.railway.app/webhook/${token}`;
    try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});