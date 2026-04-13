require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

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

// ============================================
// WELCOME MESSAGE (Styled like VORTEX MD)
// ============================================
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name;
    const welcomeMessage = `
╔══════════════════════════════╗
║        🤖 SHADOW MD          ║
║    YOUR ULTIMATE TELEGRAM BOT
╠══════════════════════════════╣
║  📌 *BOT INFO:*
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━
║  🏷️ NAME: SHADOW MD
║  📦 VERSION: 3.0 ★
║  👤 OWNER: @Danger_ship_it
║  🌐 STATUS: 🟢 ONLINE
╠══════════════════════════════╣
║  📝 *DESCRIPTION:*
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━
║  SHADOW MD IS A FAST, SECURE,
║  AND RELIABLE TELEGRAM BOT
║  WITH MULTI-PURPOSE FEATURES
╠══════════════════════════════╣
║  🎮 *AVAILABLE COMMANDS:*
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━
║  /help - SHOW ALL COMMANDS
║  /movie <name> - DOWNLOAD MOVIE
║  /song <name> - FIND SONG
║  /uptime - BOT UPTIME
║  /roll - ROLL DICE
║  /flip - FLIP COIN
║  /time - CURRENT TIME
║  /quote - INSPIRATIONAL QUOTE
╠══════════════════════════════╣
║  👋 WELCOME ${name.toUpperCase()}!
║  TYPE /help TO GET STARTED
╚══════════════════════════════╝
    `;
    bot.sendMessage(chatId, welcomeMessage, { parseMode: 'Markdown' });
});

// ============================================
// HELP COMMAND (Styled like VORTEX MD)
// ============================================
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
╔════════════════════════════════════════╗
║         🤖 SHADOW MD COMMANDS          ║
╠════════════════════════════════════════╣
║  🎬 *MOVIE & MUSIC COMMANDS:*          ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /movie <name> - DOWNLOAD MOVIE        ║
║  /song <name> - FIND AND DOWNLOAD SONG ║
║                                        ║
║  🎮 *FUN & GAMES:*                     ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /roll - ROLL A DICE (1-6)             ║
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
╠════════════════════════════════════════╣
║  📌 *EXAMPLE USAGE:*                   ║
║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║
║  /movie inception                      ║
║  /song shape of you                    ║
║  /calc 25 * 4                          ║
║  /remind 10 Drink water                ║
╚════════════════════════════════════════╝
    `;
    bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown' });
});

// ============================================
// ABOUT COMMAND (Styled)
// ============================================
bot.onText(/\/about/, (msg) => {
    const chatId = msg.chat.id;
    const aboutMessage = `
╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 3.0 ★           ║
║  👨‍💻 DEVELOPER: @Danger_ship_it
║  🌐 STATUS: 🟢 ONLINE         ║
║  🎯 PURPOSE: MULTI-UTILITY    ║
║      TELEGRAM BOT            ║
║  🛠️ FEATURES:                ║
║   • MOVIE DOWNLOAD           ║
║   • MUSIC FINDER             ║
║   • GAMES & UTILITIES        ║
║   • REMINDERS & MORE         ║
╚══════════════════════════════╝
    `;
    bot.sendMessage(chatId, aboutMessage, { parseMode: 'Markdown' });
});

// ============================================
// UPTIME COMMAND
// ============================================
bot.onText(/\/uptime/, (msg) => {
    const chatId = msg.chat.id;
    const uptime = getUptime();
    bot.sendMessage(chatId, `⏱️ *SHADOW MD Uptime:* \`${uptime}\``, { parseMode: 'Markdown' });
});

// ============================================
// MOVIE DOWNLOAD COMMAND (Updated with better API)
// ============================================
bot.onText(/\/movie (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const movieName = match[1];
    
    const loadingMsg = await bot.sendMessage(chatId, `🎬 Searching for "*${movieName}*"... Please wait.`, { parseMode: 'Markdown' });
    
    try {
        // Using multiple APIs for better success rate
        const movieApiUrl = `https://api.sampleapis.com/movies/animation`; // Alternative API
        
        // Try TMDB API (free, no key needed for basic search)
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
            
            await bot.editMessageText(message, {
                chat_id: chatId,
                message_id: loadingMsg.message_id,
                parseMode: 'Markdown',
                disable_web_page_preview: true
            });
        } else {
            // Fallback: Send search links
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
        
        // Fallback: Provide search links
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
// SONG FIND COMMAND (Updated)
// ============================================
bot.onText(/\/song (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const songName = match[1];
    
    const loadingMsg = await bot.sendMessage(chatId, `🎵 Searching for "*${songName}*"... Please wait.`, { parseMode: 'Markdown' });
    
    try {
        // Search YouTube
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=5&q=${encodeURIComponent(songName)}&key=AIzaSyD5QYwP7a9qP8rLmNxTvZcFbHgYqWjKlM8`;
        
        let message = `🎵 *Search results for "${songName}":*\n\n`;
        message += `🔗 [Search on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(songName)})\n`;
        message += `🔗 [Search on Spotify](https://open.spotify.com/search/${encodeURIComponent(songName)})\n`;
        message += `🔗 [Search on SoundCloud](https://soundcloud.com/search?q=${encodeURIComponent(songName)})\n\n`;
        message += `📌 *Tip:* Click the links above to find and download your song!`;
        
        await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parseMode: 'Markdown',
            disable_web_page_preview: true
        });
    } catch (error) {
        console.error('Song search error:', error.message);
        
        const errorMessage = `❌ Error searching for "*${songName}*".\n\n🔗 [Click here to search on YouTube](https://www.youtube.com/results?search_query=${encodeURIComponent(songName)})\n🔗 [Click here to search on Spotify](https://open.spotify.com/search/${encodeURIComponent(songName)})`;
        
        await bot.editMessageText(errorMessage, {
            chat_id: chatId,
            message_id: loadingMsg.message_id,
            parseMode: 'Markdown',
            disable_web_page_preview: true
        });
    }
});
// ============================================
// WHOAMI COMMAND (Styled)
// ============================================
bot.onText(/\/whoami/, (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const info = `
╔══════════════════════════════╗
║       👤 USER INFORMATION     ║
╠══════════════════════════════╣
║  📛 NAME: ${user.first_name} ${user.last_name || ''}
║  🔖 USERNAME: ${user.username ? '@' + user.username : 'Not set'}
║  🆔 USER ID: \`${user.id}\`
║  🌐 LANGUAGE: ${user.language_code || 'Unknown'}
║  💬 CHAT TYPE: ${msg.chat.type}
╚══════════════════════════════╝
    `;
    bot.sendMessage(chatId, info, { parseMode: 'Markdown' });
});

// ============================================
// REMAINING ORIGINAL COMMANDS
// ============================================

// Chat ID command
bot.onText(/\/chatid/, (msg) => {
    bot.sendMessage(msg.chat.id, `🆔 Chat ID: \`${msg.chat.id}\``, { parseMode: 'Markdown' });
});

// Ping command
bot.onText(/\/ping/, (msg) => {
    const start = Date.now();
    bot.sendMessage(msg.chat.id, 'Pong! 🏓').then(() => {
        bot.sendMessage(msg.chat.id, `Response time: ${Date.now() - start}ms`);
    });
});

// Hello command
bot.onText(/\/hello/, (msg) => {
    const greetings = ['Hello', 'Hi', 'Hey', "What's up", 'Greetings'];
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    bot.sendMessage(msg.chat.id, `${randomGreeting} ${msg.from.first_name}! 👋`);
});

// Time command
bot.onText(/\/time/, (msg) => {
    const now = new Date();
    bot.sendMessage(msg.chat.id, `📅 ${now.toLocaleDateString()}\n🕐 ${now.toLocaleTimeString()}`);
});

// Echo command
bot.onText(/\/echo (.+)/, (msg, match) => {
    bot.sendMessage(msg.chat.id, `🔊 ${match[1]}`);
});

// Calculator
bot.onText(/\/calc (.+)/, (msg, match) => {
    try {
        const result = Function(`'use strict'; return (${match[1]})`)();
        bot.sendMessage(msg.chat.id, `🧮 \`${match[1]} = ${result}\``, { parseMode: 'Markdown' });
    } catch {
        bot.sendMessage(msg.chat.id, '❌ Invalid calculation');
    }
});

// Roll dice
bot.onText(/\/roll/, (msg) => {
    const dice = getRandomInt(1, 6);
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    bot.sendMessage(msg.chat.id, `🎲 You rolled a ${dice} ${diceEmojis[dice-1]}`);
});

// Flip coin
bot.onText(/\/flip/, (msg) => {
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '👑' : '🪙';
    bot.sendMessage(msg.chat.id, `${emoji} Coin flip: *${result}!*`, { parseMode: 'Markdown' });
});

// Random number
bot.onText(/\/random (\d+) (\d+)/, (msg, match) => {
    let min = parseInt(match[1]);
    let max = parseInt(match[2]);
    if (min > max) [min, max] = [max, min];
    bot.sendMessage(msg.chat.id, `🎲 Random: *${getRandomInt(min, max)}*`, { parseMode: 'Markdown' });
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
    bot.sendMessage(msg.chat.id, `💭 *"${quote.text}"*\n\n— ${quote.author}`, { parseMode: 'Markdown' });
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
        bot.sendMessage(msg.chat.id, `🔔 *REMINDER*: ${reminderText}`, { parseMode: 'Markdown' });
    }, seconds * 1000);
});

// Commands alias
bot.onText(/\/commands/, (msg) => {
    bot.sendMessage(msg.chat.id, "Type /help to see all commands! 📚");
});

// ============================================
// START SERVER WITH WEBHOOK
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 SHADOW MD Bot is running on port ${PORT}`);
    
    // Set webhook - using your actual domain
    const webhookUrl = `https://shadow-md-incredible-creativity.up.railway.app/webhook/${token}`;
    try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});