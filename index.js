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
// START COMMAND WITH BUTTONS
// ============================================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name;
    
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
                    { text: "📝 REPORT", callback_data: "report" },
                    { text: "🏓 PING", callback_data: "ping" }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, welcomeMessage, { parseMode: 'Markdown', ...options });
});

// ============================================
// HELP COMMAND WITH BUTTONS
// ============================================
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
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
                    { text: "⏱️ UPTIME", callback_data: "uptime" },
                    { text: "👤 WHOAMI", callback_data: "whoami" }
                ]
            ]
        }
    };
    
    bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown', ...options });
});

// ============================================
// ABOUT COMMAND
// ============================================
bot.onText(/\/about/, (msg) => {
    const chatId = msg.chat.id;
    const aboutMessage = `╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 2.0 ★           ║
║  👨‍💻 DEVELOPER: @shadowtechmax ║
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
    
    bot.sendMessage(chatId, aboutMessage, { parseMode: 'Markdown', ...options });
});

// ============================================
// REPORT COMMAND
// ============================================
bot.onText(/\/report/, (msg) => {
    const chatId = msg.chat.id;
    const message = `╔══════════════════════════════╗
║       📝 REPORT ISSUE        ║
╠══════════════════════════════╣
║  TO REPORT AN ISSUE:        ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  CONTACT DEVELOPER:         ║
║  @shadowtechmax              ║
║                             ║
║  OR SEND MESSAGE TO:        ║
║  📧 shadowtech@gmail.com    ║
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
    
    bot.sendMessage(chatId, message, { parseMode: 'Markdown', ...options });
});

// ============================================
// UPTIME COMMAND
// ============================================
bot.onText(/\/uptime/, (msg) => {
    const chatId = msg.chat.id;
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
    
    bot.sendMessage(chatId, `⏱️ *SHADOW MD Uptime:* \`${uptime}\``, { parseMode: 'Markdown', ...options });
});

// ============================================
// WHOAMI COMMAND
// ============================================
bot.onText(/\/whoami/, (msg) => {
    const chatId = msg.chat.id;
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
    
    bot.sendMessage(chatId, info, { parseMode: 'Markdown', ...options });
});

// ============================================
// MOVIE COMMAND
// ============================================
bot.onText(/\/movie (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
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
        
        const errorMessage = `❌ Error searching for "*${movieName}*".\n\n🔍 Try these links:\n🔗 [Google Search](https://www.google.com/search?q=${encodeURIComponent(movieName)}+movie+download)\n🔗 [YouTube Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(movieName)}+trailer)\n🔗 [IMDb Page](https://www.imdb.com/find?q=${encodeURIComponent(movieName)})\n\n📌 Tip: Try a different movie name or use /song for music!`;
        
        await bot.editMessageText(errorMessage, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parseMode: 'Markdown',
            disable_web_page_preview: true
        });
    }
});
// ============================================
// SONG COMMAND - Provides YouTube links (RELIABLE)
// ============================================
bot.onText(/\/song (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
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
            message += `2. Use a YouTube to MP3 converter (search Google)\n`;
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
            await bot.editMessageText(`❌ No results found for "*${songName}*".\n\nTry:\n🔗 [Search on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(songName)})\n🔗 [Search on Spotify](https://open.spotify.com/search/${encodeURIComponent(songName)})`, {
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
bot.onText(/\/ping/, (msg) => {
    const chatId = msg.chat.id;
    const start = Date.now();
    
    bot.sendMessage(chatId, 'Pong! 🏓').then((sentMsg) => {
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
        
        bot.editMessageText(`🏓 Pong!\n⏱️ Response time: ${responseTime}ms`, {
            chat_id: chatId,
            message_id: sentMsg.message_id,
            parseMode: 'Markdown',
            ...options
        });
    });
});

// ============================================
// OTHER UTILITY COMMANDS
// ============================================

// Chat ID command
bot.onText(/\/chatid/, (msg) => {
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
    bot.sendMessage(msg.chat.id, `🆔 Chat ID: \`${msg.chat.id}\``, { parseMode: 'Markdown', ...options });
});

// Hello command
bot.onText(/\/hello/, (msg) => {
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
    bot.sendMessage(msg.chat.id, `${randomGreeting} ${msg.from.first_name}! 👋`, { ...options });
});

// Time command
bot.onText(/\/time/, (msg) => {
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
    bot.sendMessage(msg.chat.id, `📅 ${now.toLocaleDateString()}\n🕐 ${now.toLocaleTimeString()}`, { ...options });
});

// Echo command
bot.onText(/\/echo (.+)/, (msg, match) => {
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
    bot.sendMessage(msg.chat.id, `🔊 ${match[1]}`, { ...options });
});

// Calculator
bot.onText(/\/calc (.+)/, (msg, match) => {
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
        bot.sendMessage(msg.chat.id, `🧮 \`${match[1]} = ${result}\``, { parseMode: 'Markdown', ...options });
    } catch {
        bot.sendMessage(msg.chat.id, '❌ Invalid calculation');
    }
});

// Roll dice
bot.onText(/\/roll/, (msg) => {
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
    bot.sendMessage(msg.chat.id, `🎲 You rolled a ${dice} ${diceEmojis[dice-1]}`, { ...options });
});

// Flip coin
bot.onText(/\/flip/, (msg) => {
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
    bot.sendMessage(msg.chat.id, `${emoji} Coin flip: *${result}!*`, { parseMode: 'Markdown', ...options });
});

// Random number
bot.onText(/\/random (\d+) (\d+)/, (msg, match) => {
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
    bot.sendMessage(msg.chat.id, `🎲 Random: *${getRandomInt(min, max)}*`, { parseMode: 'Markdown', ...options });
});

// Quote command
bot.onText(/\/quote/, (msg) => {
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
    bot.sendMessage(msg.chat.id, `💭 *"${quote.text}"*\n\n— ${quote.author}`, { parseMode: 'Markdown', ...options });
});

// Reminder command
bot.onText(/\/remind (\d+) (.+)/, (msg, match) => {
    const seconds = parseInt(match[1]);
    const reminderText = match[2];
    if (seconds <= 0 || seconds > 3600) {
        bot.sendMessage(msg.chat.id, '❌ Set reminder between 1-3600 seconds');
        return;
    }
    bot.sendMessage(msg.chat.id, `⏰ Reminder in ${seconds} seconds: "${reminderText}"`);
    setTimeout(() => {
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
        bot.sendMessage(msg.chat.id, `🔔 *REMINDER*: ${reminderText}`, { parseMode: 'Markdown', ...options });
    }, seconds * 1000);
});
// ============================================
// CALLBACK QUERY HANDLER (For button presses)
// ============================================
bot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const chatId = message.chat.id;
    const messageId = message.message_id;
    const data = callbackQuery.data;
    
    // Answer the callback to remove loading state
    await bot.answerCallbackQuery(callbackQuery.id);
    
    // Handle different button presses
    switch(data) {
        case 'start':
            // Send new welcome message instead of editing
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
                            { text: "📝 REPORT", callback_data: "report" },
                            { text: "🏓 PING", callback_data: "ping" }
                        ]
                    ]
                }
            };
            
            await bot.sendMessage(chatId, welcomeMessage, { parseMode: 'Markdown', ...options });
            break;
            
        case 'help':
            const helpMessage = `╔════════════════════════════════════════╗
║         🤖 SHADOW MD COMMANDS          ║
╠════════════════════════════════════════╣
║  🎬 *MOVIE & MUSIC COMMANDS:*          ║
║  /movie <name> - FIND MOVIE            ║
║  /song <name> - DOWNLOAD SONG          ║
║                                        ║
║  🎮 *FUN & GAMES:*                     ║
║  /roll - ROLL A DICE                   ║
║  /flip - FLIP A COIN                   ║
║  /random <min> <max> - RANDOM NUMBER   ║
║  /quote - RANDOM QUOTE                 ║
║  /hello - GET A GREETING               ║
║                                        ║
║  🔧 *UTILITY COMMANDS:*                ║
║  /time - CURRENT DATE & TIME           ║
║  /uptime - BOT UPTIME                  ║
║  /echo <msg> - REPEAT MESSAGE          ║
║  /calc <exp> - CALCULATE MATH          ║
║  /remind <sec> <msg> - SET REMINDER    ║
║                                        ║
║  ℹ️ *INFO COMMANDS:*                   ║
║  /about - ABOUT SHADOW MD              ║
║  /whoami - YOUR USER INFO              ║
║  /chatid - GET CHAT ID                 ║
║  /ping - CHECK RESPONSE TIME           ║
╚════════════════════════════════════════╝`;

            const helpOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "ℹ️ ABOUT", callback_data: "about" }
                        ]
                    ]
                }
            };
            
            await bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown', ...helpOptions });
            break;
            
        case 'about':
            const aboutMessage = `╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 2.0 ★           ║
║  👨‍💻 DEVELOPER: @shadowcodehmax ║
║  🌐 STATUS: 🟢 ONLINE         ║
║  🎯 PURPOSE: MULTI-UTILITY    ║
║      TELEGRAM BOT            ║
║  🛠️ FEATURES:                ║
║   • MUSIC SEARCH             ║
║   • MOVIE FINDER             ║
║   • GAMES & UTILITIES        ║
║   • REMINDERS & MORE         ║
╚══════════════════════════════╝`;

            const aboutOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "📚 HELP", callback_data: "help" }
                        ]
                    ]
                }
            };
            
            await bot.sendMessage(chatId, aboutMessage, { parseMode: 'Markdown', ...aboutOptions });
            break;
            
        case 'movie':
            await bot.sendMessage(chatId, "🎬 *Send me a movie name:*\nExample: `/movie inception`", { parseMode: 'Markdown' });
            break;
            
        case 'song':
            await bot.sendMessage(chatId, "🎵 *Send me a song name:*\nExample: `/song shape of you`", { parseMode: 'Markdown' });
            break;
            
        case 'uptime':
            const uptime = getUptime();
            const uptimeOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "📚 HELP", callback_data: "help" }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, `⏱️ *SHADOW MD Uptime:* \`${uptime}\``, { parseMode: 'Markdown', ...uptimeOptions });
            break;
            
        case 'whoami':
            const user = callbackQuery.from;
            const info = `╔══════════════════════════════╗
║       👤 USER INFORMATION     ║
╠══════════════════════════════╣
║  📛 NAME: ${user.first_name} ${user.last_name || ''}
║  🔖 USERNAME: ${user.username ? '@' + user.username : 'Not set'}
║  🆔 USER ID: \`${user.id}\`
║  🌐 LANGUAGE: ${user.language_code || 'Unknown'}
╚══════════════════════════════╝`;
            
            const whoamiOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "📚 HELP", callback_data: "help" }
                        ]
                    ]
                }
            };
            
            await bot.sendMessage(chatId, info, { parseMode: 'Markdown', ...whoamiOptions });
            break;
            
        case 'roll':
            const dice = getRandomInt(1, 6);
            const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            const rollOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🎲 ROLL AGAIN", callback_data: "roll" },
                            { text: "🏠 HOME", callback_data: "start" }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, `🎲 You rolled a ${dice} ${diceEmojis[dice-1]}`, { ...rollOptions });
            break;
            
        case 'flip':
            const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
            const emoji = result === 'Heads' ? '👑' : '🪙';
            const flipOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🪙 FLIP AGAIN", callback_data: "flip" },
                            { text: "🏠 HOME", callback_data: "start" }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, `${emoji} Coin flip: *${result}!*`, { parseMode: 'Markdown', ...flipOptions });
            break;
            
        case 'time':
            const now = new Date();
            const timeOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "📚 HELP", callback_data: "help" }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, `📅 ${now.toLocaleDateString()}\n🕐 ${now.toLocaleTimeString()}`, { ...timeOptions });
            break;
            
        case 'quote':
            const quotes = [
                { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
                { text: "Stay hungry, stay foolish.", author: "Steve Jobs" },
                { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" }
            ];
            const quote = quotes[Math.floor(Math.random() * quotes.length)];
            const quoteOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "💭 ANOTHER QUOTE", callback_data: "quote" },
                            { text: "🏠 HOME", callback_data: "start" }
                        ]
                    ]
                }
            };
            await bot.sendMessage(chatId, `💭 *"${quote.text}"*\n\n— ${quote.author}`, { parseMode: 'Markdown', ...quoteOptions });
            break;
            
        case 'report':
            const reportMessage = `╔══════════════════════════════╗
║       📝 REPORT ISSUE        ║
╠══════════════════════════════╣
║  CONTACT DEVELOPER:         ║
║  @shadowcodemax              ║
║                             ║
║  OR EMAIL:                  ║
║  📧 shadowtech@gmail.com    ║
╚══════════════════════════════╝`;
            
            const reportOptions = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "🏠 HOME", callback_data: "start" },
                            { text: "📚 HELP", callback_data: "help" }
                        ]
                    ]
                }
            };
            
            await bot.sendMessage(chatId, reportMessage, { parseMode: 'Markdown', ...reportOptions });
            break;
            
        case 'ping':
            const start = Date.now();
            const pingMsg = await bot.sendMessage(chatId, "Pong! 🏓");
            const responseTime = Date.now() - start;
            const pingOptions = {
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
                message_id: pingMsg.message_id,
                parseMode: 'Markdown',
                ...pingOptions
            });
            break;
            
        case 'movie_prompt':
            await bot.sendMessage(chatId, "🎬 *Send me a movie name:*\nExample: `/movie inception`", { parseMode: 'Markdown' });
            break;
            
        case 'song_prompt':
            await bot.sendMessage(chatId, "🎵 *Send me a song name:*\nExample: `/song shape of you`", { parseMode: 'Markdown' });
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
    
    // Set webhook - update with your actual domain
    const webhookUrl = `https://shadow-md-incredible-creativity.up.railway.app/webhook/${token}`;
    try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});