require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
    console.error('❌ ERROR: TELEGRAM_BOT_TOKEN not found');
    process.exit(1);
}

const bot = new TelegramBot(token);
const app = express();

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

// Start command
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const name = msg.from.first_name;
    bot.sendMessage(chatId, `Welcome ${name}! 🎉\n\nI'm SHADOW MD bot. Type /help to see everything I can do!`);
});

// Help command
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🤖 *SHADOW MD - COMPLETE COMMANDS LIST*

*💬 Basic Commands:*
/start - Welcome message
/help - Show this menu
/about - About SHADOW MD
/whoami - Your user info

*🎮 Fun & Games:*
/hello - Get a greeting
/roll - Roll a dice (1-6)
/flip - Flip a coin
/random <min> <max> - Random number
/quote - Random inspirational quote

*🔧 Utility Commands:*
/time - Current date & time
/echo <message> - Repeat your message
/calc <expression> - Calculate math
/remind <seconds> <message> - Set a reminder

*ℹ️ Info Commands:*
/ping - Check bot response time
/chatid - Get this chat ID
/commands - Alternative help menu
    `;
    bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown' });
});

// About command
bot.onText(/\/about/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, `🤖 *SHADOW MD Bot*\nVersion: 2.0.0\nStatus: 🟢 Online\nFeatures: Games, Utilities, Calculations & more!`, { parseMode: 'Markdown' });
});

// Whoami command
bot.onText(/\/whoami/, (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const info = `👤 *Your Information*\nName: ${user.first_name} ${user.last_name || ''}\nUsername: ${user.username ? '@' + user.username : 'Not set'}\nUser ID: \`${user.id}\``;
    bot.sendMessage(chatId, info, { parseMode: 'Markdown' });
});

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
        { text: "Be the change you wish to see in the world.", author: "Mahatma Gandhi" }
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

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 SHADOW MD Bot is running on port ${PORT}`);
    
    // Set webhook
    const webhookUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook/${token}`;
    try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});