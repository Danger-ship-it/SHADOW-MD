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
                    [{ text: "🛠️ TOOLS", callback_data: "tools" }, { text: "💰 MONEY", callback_data: "money" }],
                    [{ text: "🎬 MOVIE", callback_data: "movie" }, { text: "🎵 SONG", callback_data: "song" }],
                    [{ text: "📝 REPORT", callback_data: "report" }]
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
║  🌤️ *UTILITY COMMANDS:*               ║
║  /weather <city> - Weather info       ║
║  /translate <text> - Translate        ║
║  /shorten <url> - Shorten URL         ║
║  /time - Current time                 ║
║  /calc <exp> - Calculator             ║
║                                        ║
║  📚 *EDUCATION:*                       ║
║  /define <word> - Dictionary          ║
║  /wiki <topic> - Wikipedia            ║
║  /fact - Random fact                  ║
║  /quiz - Mini quiz game               ║
║                                        ║
║  💰 *MONEY & HUSTLE:*                  ║
║  /crypto - Crypto prices              ║
║  /rate <currency> - Exchange rate     ║
║  /earn - Make money online            ║
║  /airtime - Buy airtime               ║
║  /data - Cheap data plans             ║
║                                        ║
║  😂 *FUN COMMANDS:*                    ║
║  /joke - Random joke                  ║
║  /meme - Random meme                  ║
║  /roast - Funny roast                 ║
║  /quote - Motivational quote          ║
║  /ship @user1 @user2 - Compatibility  ║
║  /rps - Rock Paper Scissors           ║
║  /trivia - Trivia game                ║
║  /number - Guess the number           ║
║  /8ball <q> - Magic 8-Ball            ║
║                                        ║
║  🤖 *AI & TECH:*                       ║
║  /ask <q> - AI response               ║
║  /name - Business name ideas          ║
║  /caption <idea> - Social caption     ║
║  /json <text> - Format JSON           ║
║  /qrcode <text> - Generate QR         ║
║  /ip <address> - IP lookup            ║
║  /password - Strong password          ║
║  /sticker - Sticker to image          ║
║                                        ║
║  📲 *GROWTH FEATURES:*                 ║
║  /refer - Referral link               ║
║  /daily - Daily reward                ║
║  /leaderboard - Top users             ║
║  /invite - Invite message             ║
║                                        ║
║  🎬 *MEDIA:*                           ║
║  /movie <name> - Movie info           ║
║  /song <name> - Search song           ║
║                                        ║
║  ℹ️ *INFO:*                            ║
║  /about - About bot                   ║
║  /uptime - Bot uptime                 ║
║  /ping - Response time                ║
║  /whoami - Your info                  ║
║  /report - Report issue               ║
╚════════════════════════════════════════╝`;

    await bot.sendMessage(chatId, helpMessage, { parseMode: 'Markdown' });
});

// ============================================
// ABOUT COMMAND
// ============================================
bot.onText(/\/about/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `╔══════════════════════════════╗
║     🤖 ABOUT SHADOW MD       ║
╠══════════════════════════════╣
║  📌 NAME: SHADOW MD          ║
║  📦 VERSION: 4.0 ★           ║
║  👨‍💻 DEVELOPER: @shadowcodemax ║
║  🌐 STATUS: 🟢 ONLINE         ║
║  📅 UPTIME: ${getUptime()}    ║
║  🎯 FEATURES:                ║
║   • FOOTBALL UPDATES        ║
║   • 50+ COMMANDS            ║
║   • TOOLS & UTILITIES       ║
║   • GAMES & FUN             ║
║   • MONEY TIPS              ║
║   • AI FEATURES             ║
║   • REFERRAL SYSTEM         ║
╚══════════════════════════════╝`, { parseMode: 'Markdown' });
});

// ============================================
// FOOTBALL COMMANDS
// ============================================

bot.onText(/\/eplstandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *PREMIER LEAGUE STANDINGS*\n\n1. Manchester City - 85 pts\n2. Arsenal - 80 pts\n3. Liverpool - 75 pts\n4. Aston Villa - 67 pts\n5. Tottenham - 63 pts", { parseMode: 'Markdown' });
});

bot.onText(/\/eplmatches/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "⚽ *UPCOMING EPL MATCHES*\n\nArsenal vs Chelsea\nManchester City vs Liverpool\nManchester United vs Tottenham\nNewcastle vs Aston Villa", { parseMode: 'Markdown' });
});

bot.onText(/\/eplscorers/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "⚽ *EPL TOP SCORERS*\n\n1. Erling Haaland - 25 goals\n2. Mohamed Salah - 22 goals\n3. Ollie Watkins - 19 goals\n4. Cole Palmer - 18 goals\n5. Son Heung-min - 16 goals", { parseMode: 'Markdown' });
});

bot.onText(/\/laligastandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *LA LIGA STANDINGS*\n\n1. Real Madrid - 85 pts\n2. Barcelona - 76 pts\n3. Girona - 71 pts\n4. Atletico Madrid - 67 pts", { parseMode: 'Markdown' });
});

bot.onText(/\/serieastandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *SERIE A STANDINGS*\n\n1. Inter Milan - 86 pts\n2. AC Milan - 70 pts\n3. Juventus - 66 pts\n4. Bologna - 64 pts", { parseMode: 'Markdown' });
});

bot.onText(/\/clstandings/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, "🏆 *CHAMPIONS LEAGUE - QUARTERFINALS*\n\nReal Madrid vs Manchester City\nBayern Munich vs Arsenal\nPSG vs Barcelona\nAtletico Madrid vs Dortmund", { parseMode: 'Markdown' });
});

// ============================================
// UTILITY COMMANDS
// ============================================

bot.onText(/\/weather (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const city = match[1];
    await bot.sendMessage(chatId, `🌤️ *Weather in ${city}:*\n\n🌡️ Temperature: 25°C\n💨 Wind: 12 km/h\n💧 Humidity: 65%\n☀️ Condition: Sunny\n\n📊 Live weather data coming soon!`, { parseMode: 'Markdown' });
});

bot.onText(/\/translate (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const text = match[1];
    await bot.sendMessage(chatId, `🌐 *TRANSLATION*\n\nOriginal: "${text}"\n\n🇪🇸 Spanish: "${text}"\n🇫🇷 French: "${text}"\n🇩🇪 German: "${text}"\n\n💡 Full translation API coming soon!`, { parseMode: 'Markdown' });
});

bot.onText(/\/shorten (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const url = match[1];
    try {
        const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
        await bot.sendMessage(chatId, `🔗 *SHORTENED URL*\n\nOriginal: ${url}\nShortened: ${response.data}`, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, "❌ Failed to shorten URL. Please try again.");
    }
});

bot.onText(/\/time/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const now = new Date();
    await bot.sendMessage(chatId, `📅 *DATE & TIME*\n\n📆 Date: ${now.toLocaleDateString()}\n🕐 Time: ${now.toLocaleTimeString()}\n🌍 Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`, { parseMode: 'Markdown' });
});

bot.onText(/\/calc (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    try {
        const result = Function(`'use strict'; return (${match[1]})`)();
        await bot.sendMessage(chatId, `🧮 *CALCULATOR*\n\n${match[1]} = ${result}`, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, "❌ Invalid calculation. Example: /calc 2+2");
    }
});

// ============================================
// EDUCATION COMMANDS
// ============================================

bot.onText(/\/define (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const word = match[1];
    await bot.sendMessage(chatId, `📖 *DICTIONARY*\n\nWord: ${word}\nMeaning: The definition of "${word}" will appear here.\n\n💡 Full dictionary feature coming soon!\n\n🔗 Try: https://www.dictionary.com/browse/${word}`, { parseMode: 'Markdown' });
});

bot.onText(/\/wiki (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const topic = match[1];
    await bot.sendMessage(chatId, `📚 *WIKIPEDIA*\n\nTopic: ${topic}\n\n🔗 [Read full article](https://en.wikipedia.org/wiki/${encodeURIComponent(topic.replace(/ /g, '_'))})\n\n💡 Wikipedia has detailed information about "${topic}". Click the link to learn more!`, { parseMode: 'Markdown', disable_web_page_preview: true });
});

bot.onText(/\/fact/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const facts = [
        "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs!",
        "Octopuses have three hearts and blue blood.",
        "A day on Venus is longer than a year on Venus.",
        "Bananas are berries, but strawberries aren't!",
        "The Eiffel Tower can grow up to 15 cm in summer due to heat expansion."
    ];
    const fact = facts[Math.floor(Math.random() * facts.length)];
    await bot.sendMessage(chatId, `📖 *RANDOM FACT*\n\n${fact}`, { parseMode: 'Markdown' });
});

bot.onText(/\/quiz/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const quizzes = [
        { q: "What is the capital of France?", a: "Paris" },
        { q: "What is 15 + 27?", a: "42" },
        { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci" },
        { q: "What is the largest ocean on Earth?", a: "Pacific Ocean" }
    ];
    const quiz = quizzes[Math.floor(Math.random() * quizzes.length)];
    await bot.sendMessage(chatId, `📚 *QUIZ TIME!*\n\n${quiz.q}\n\nSend your answer!`, { parseMode: 'Markdown' });
});

// ============================================
// MONEY & HUSTLE COMMANDS
// ============================================

bot.onText(/\/crypto/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `💰 *CRYPTO PRICES*\n\n🟠 Bitcoin (BTC): $65,432\n🔷 Ethereum (ETH): $3,456\n🟢 Binance (BNB): $589\n🟣 Solana (SOL): $167\n📊 Cardano (ADA): $0.45\n\n📈 Live prices every minute!`, { parseMode: 'Markdown' });
});

bot.onText(/\/rate (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const currency = match[1].toUpperCase();
    const rates = {
        NGN: "1 USD = 1,500 NGN",
        EUR: "1 USD = 0.92 EUR",
        GBP: "1 USD = 0.79 GBP",
        JPY: "1 USD = 154 JPY"
    };
    const rate = rates[currency] || "Rate not available";
    await bot.sendMessage(chatId, `💱 *EXCHANGE RATE*\n\n${rate}\n\n📊 Sample rates - Check live for accuracy`, { parseMode: 'Markdown' });
});

bot.onText(/\/earn/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `💰 *WAYS TO EARN ONLINE (2025)*\n\n1️⃣ **Freelancing** - Upwork, Fiverr, Freelancer\n2️⃣ **Affiliate Marketing** - Sell products, earn commission\n3️⃣ **Crypto Trading** - Buy low, sell high\n4️⃣ **Content Creation** - YouTube, TikTok, Instagram\n5️⃣ **Online Surveys** - Swagbucks, PrizeRebel\n6️⃣ **Dropshipping** - Sell without inventory\n7️⃣ **Digital Products** - Ebooks, courses, templates\n\n💡 Start with what you're good at!`, { parseMode: 'Markdown' });
});

bot.onText(/\/airtime/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `📱 *BUY AIRTIME NIGERIA*\n\n**USSD CODES:**\n• MTN: *311*Amount#\n• GLO: *311*Amount#\n• AIRTEL: *311*Amount#\n• 9MOBILE: *311*Amount#\n\n**APPS:**\n🔗 VTpass\n🔗 Recharge & Get Paid\n🔗 PocketMoni\n\n💡 Get discounts on bulk purchases!`, { parseMode: 'Markdown' });
});

bot.onText(/\/data/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `📶 *CHEAP DATA PLANS NIGERIA*\n\n**MTN:**\n1GB - ₦500\n2GB - ₦900\n5GB - ₦2000\n\n**GLO:**\n1GB - ₦400\n3GB - ₦1000\n\n**AIRTEL:**\n1GB - ₦550\n3GB - ₦1500\n\n**9MOBILE:**\n1GB - ₦450\n2GB - ₦800\n\n🔗 Best deals: https://cheapestdata.com.ng`, { parseMode: 'Markdown' });
});

// ============================================
// FUN COMMANDS
// ============================================

bot.onText(/\/joke/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const jokes = [
        "Why don't scientists trust atoms? Because they make up everything!",
        "What do you call a fake noodle? An impasta!",
        "Why did the scarecrow win an award? He was outstanding in his field!",
        "What do you call a bear with no teeth? A gummy bear!",
        "Why don't eggs tell jokes? They'd crack each other up!"
    ];
    const joke = jokes[Math.floor(Math.random() * jokes.length)];
    await bot.sendMessage(chatId, `😂 *JOKE*\n\n${joke}`, { parseMode: 'Markdown' });
});

bot.onText(/\/meme/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const memes = [
        "https://i.imgflip.com/1bij.jpg",
        "https://i.imgflip.com/26am.jpg",
        "https://i.imgflip.com/30b1gx.jpg",
        "https://i.imgflip.com/9iz6m.jpg"
    ];
    const randomMeme = memes[Math.floor(Math.random() * memes.length)];
    await bot.sendPhoto(chatId, randomMeme, { caption: "😂 *Meme of the day!*" });
});

bot.onText(/\/roast/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const roasts = [
        "You're not stupid; you just have bad luck thinking.",
        "Your secrets are safe with me. I never listen anyway.",
        "You bring everyone so much joy... when you leave.",
        "I'd agree with you, but then we'd both be wrong.",
        "You're like a cloud. When you disappear, it's a beautiful day."
    ];
    const roast = roasts[Math.floor(Math.random() * roasts.length)];
    await bot.sendMessage(chatId, `🔥 *ROAST*\n\n${roast}`, { parseMode: 'Markdown' });
});

bot.onText(/\/quote/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const quotes = [
        "The only way to do great work is to love what you do. - Steve Jobs",
        "Stay hungry, stay foolish. - Steve Jobs",
        "Be the change you wish to see in the world. - Gandhi",
        "Success is not final, failure is not fatal. - Winston Churchill",
        "The future belongs to those who believe in their dreams. - Eleanor Roosevelt"
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    await bot.sendMessage(chatId, `💭 *MOTIVATIONAL QUOTE*\n\n${quote}`, { parseMode: 'Markdown' });
});

bot.onText(/\/ship (.+) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const person1 = match[1];
    const person2 = match[2];
    const percentage = getRandomInt(0, 100);
    let emoji = percentage > 70 ? '💘' : percentage > 40 ? '💕' : '💔';
    let message = percentage > 70 ? 'Perfect match! 👰🤵' : percentage > 40 ? 'Good potential! 💑' : 'Not meant to be... 😢';
    
    await bot.sendMessage(chatId, `${emoji} *SHIP COMPATIBILITY*\n\n${person1} ❤️ ${person2}\n\nMatch: ${percentage}%\n\n${message}`, { parseMode: 'Markdown' });
});

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
        await bot.sendMessage(chatId, "📚 *TRIVIA*\n\nWhat is the capital of France?\n\nA) London\nB) Paris\nC) Berlin\nD) Madrid\n\nSend your answer (A/B/C/D)!");
    }
});

let numberGame = new Map();

bot.onText(/\/number/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const secretNumber = getRandomInt(1, 100);
    numberGame.set(userId, { secret: secretNumber, attempts: 0 });
    await bot.sendMessage(chatId, "🔢 *GUESS THE NUMBER!*\n\nI'm thinking of a number between 1 and 100.\nSend your guess!", { parseMode: 'Markdown' });
});

bot.onText(/\/8ball (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const answers = ["Yes", "No", "Maybe", "Definitely!", "Not likely", "Ask again later", "Without a doubt", "Very doubtful"];
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await bot.sendMessage(chatId, `🔮 *MAGIC 8-BALL*\n\nQuestion: ${match[1]}\nAnswer: ${answer}`, { parseMode: 'Markdown' });
});

// ============================================
// AI & TECH COMMANDS
// ============================================

bot.onText(/\/ask (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const question = match[1];
    await bot.sendMessage(chatId, `🤖 *AI RESPONSE*\n\nQuestion: ${question}\n\nAnswer: This is a demo AI response. Full AI integration coming soon!\n\n💡 For now, try searching Google or ChatGPT.`, { parseMode: 'Markdown' });
});

bot.onText(/\/name/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const names = ["NexusHub", "ShadowTech", "PrimeWave", "Velocity", "ApexCore", "FusionLab", "QuantumEdge", "StellarMind", "EchoBase", "NovaRise"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    await bot.sendMessage(chatId, `💡 *BUSINESS NAME IDEAS*\n\n✨ ${randomName}\n🎨 ${randomName} Studio\n⚡ ${randomName} Solutions\n🌟 ${randomName} Pro\n\nNeed more? Send /name again!`, { parseMode: 'Markdown' });
});

bot.onText(/\/caption (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const idea = match[1];
    await bot.sendMessage(chatId, `📝 *SOCIAL MEDIA CAPTIONS*\n\nFor: "${idea}"\n\n1️⃣ Living my best life! ✨\n2️⃣ Dreams don't work unless you do. 💪\n3️⃣ Good vibes only! 🌟\n4️⃣ Trust the process. 🔥\n5️⃣ Making moves in silence. 🤫\n\n💡 Customize these for your post!`, { parseMode: 'Markdown' });
});

bot.onText(/\/json (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const jsonText = match[1];
    try {
        const parsed = JSON.parse(jsonText);
        const formatted = JSON.stringify(parsed, null, 2);
        await bot.sendMessage(chatId, `📋 *FORMATTED JSON*\n\`\`\`json\n${formatted.substring(0, 1500)}\n\`\`\``, { parseMode: 'Markdown' });
    } catch {
        await bot.sendMessage(chatId, "❌ Invalid JSON format. Example: /json {\"name\":\"John\"}");
    }
});

bot.onText(/\/qrcode (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const text = match[1];
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    await bot.sendPhoto(chatId, qrUrl, { caption: `📱 QR Code for: ${text}` });
});

bot.onText(/\/ip (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const ip = match[1];
    await bot.sendMessage(chatId, `🌐 *IP LOOKUP*\n\nIP: ${ip}\n📍 Location: Sample City, Country\n🏢 ISP: Sample ISP Provider\n\n💡 Use ip-api.com for detailed info`, { parseMode: 'Markdown' });
});

bot.onText(/\/password/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await bot.sendMessage(chatId, `🔐 *STRONG PASSWORD*\n\`${password}\`\n\n⚠️ Save this somewhere safe!`, { parseMode: 'Markdown' });
});

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
// GROWTH FEATURES
// ============================================

const userPoints = new Map();

bot.onText(/\/refer/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const botUsername = 'ShadowMD_V2bot';
    const referLink = `https://t.me/${botUsername}?start=ref_${userId}`;
    
    await bot.sendMessage(chatId, `🔗 *YOUR REFERRAL LINK*\n\n${referLink}\n\n🎁 *REFERRAL REWARDS:*\n• Invite 5 friends → 100 points\n• Invite 10 friends → VIP access\n• Invite 20 friends → Admin status\n• Invite 50 friends → Co-owner role\n\nShare and earn! 🚀`, { parseMode: 'Markdown' });
});

bot.onText(/\/daily/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const points = getRandomInt(10, 50);
    const currentPoints = userPoints.get(userId) || 0;
    userPoints.set(userId, currentPoints + points);
    
    await bot.sendMessage(chatId, `🎁 *DAILY REWARD!*\n\nYou earned: +${points} points\nTotal points: ${currentPoints + points}\n\n💡 Use /leaderboard to see rankings\nCome back tomorrow for more!`, { parseMode: 'Markdown' });
});

bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `🏆 *TOP USERS LEADERBOARD*\n\n1. 👑 Champion - 5,000 pts\n2. ⭐ Elite - 3,500 pts\n3. 💎 Diamond - 2,800 pts\n4. 🥇 Gold - 2,000 pts\n5. 🥈 Silver - 1,500 pts\n6. 🥉 Bronze - 1,000 pts\n\n📊 Use /daily to earn points and climb the ranks!`, { parseMode: 'Markdown' });
});

bot.onText(/\/invite/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const botUsername = 'ShadowMD_V2bot';
    await bot.sendMessage(chatId, `🤖 *INVITE SHADOW MD BOT*\n\nShare this link with friends:\nhttps://t.me/${botUsername}\n\n🌟 *FEATURES:*\n• ⚽ Live football updates\n• 🎮 Fun games & trivia\n• 💰 Money making tips\n• 🤖 AI responses\n• 🔗 URL shortener\n• 📱 QR code generator\n• 🎁 Daily rewards\n• 📊 Referral system\n\nJoin the fastest growing bot! 🚀`, { parseMode: 'Markdown' });
});

// ============================================
// MOVIE & SONG COMMANDS
// ============================================

bot.onText(/\/movie (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const movieName = match[1];
    await bot.sendMessage(chatId, `🎬 *MOVIE SEARCH*\n\nSearching for: "${movieName}"\n\n🔗 [IMDb](https://www.imdb.com/find?q=${encodeURIComponent(movieName)})\n🔗 [YouTube Trailer](https://www.youtube.com/results?search_query=${encodeURIComponent(movieName)}+trailer)\n🔗 [Wikipedia](https://en.wikipedia.org/wiki/${encodeURIComponent(movieName.replace(/ /g, '_'))})\n\n💡 Click links for more info!`, { parseMode: 'Markdown', disable_web_page_preview: true });
});

bot.onText(/\/song (.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const songName = match[1];
    await bot.sendMessage(chatId, `🎵 *MUSIC SEARCH*\n\nSearching for: "${songName}"\n\n🔗 [YouTube Music](https://music.youtube.com/search?q=${encodeURIComponent(songName)})\n🔗 [Spotify](https://open.spotify.com/search/${encodeURIComponent(songName)})\n🔗 [Apple Music](https://music.apple.com/search?term=${encodeURIComponent(songName)})\n\n💡 Click links to listen!`, { parseMode: 'Markdown', disable_web_page_preview: true });
});

// ============================================
// INFO COMMANDS
// ============================================

bot.onText(/\/uptime/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `⏱️ *BOT UPTIME*\n\n${getUptime()}`, { parseMode: 'Markdown' });
});

bot.onText(/\/ping/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const start = Date.now();
    const sentMsg = await bot.sendMessage(chatId, "🏓 Pong!");
    const responseTime = Date.now() - start;
    await bot.editMessageText(`🏓 Pong!\n⏱️ Response time: ${responseTime}ms`, { chat_id: chatId, message_id: sentMsg.message_id });
});

bot.onText(/\/whoami/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const user = msg.from;
    await bot.sendMessage(chatId, `👤 *USER INFO*\n\n📛 Name: ${user.first_name} ${user.last_name || ''}\n🔖 Username: ${user.username ? '@' + user.username : 'Not set'}\n🆔 User ID: \`${user.id}\`\n🌐 Language: ${user.language_code || 'Unknown'}`, { parseMode: 'Markdown' });
});

bot.onText(/\/report/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    await bot.sendMessage(chatId, `📝 *REPORT AN ISSUE*\n\nContact developer:\n👨‍💻 Telegram: @shadowcodemax\n📧 Email: shadowtech@gmail.com\n\nDescribe your issue and we'll respond within 24 hours!`, { parseMode: 'Markdown' });
});

// ============================================
// BASIC UTILITY COMMANDS
// ============================================

bot.onText(/\/roll/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const dice = getRandomInt(1, 6);
    const diceEmojis = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    await bot.sendMessage(chatId, `🎲 You rolled: ${dice} ${diceEmojis[dice-1]}`);
});

bot.onText(/\/flip/, async (msg) => {
    const chatId = msg.chat.id;
    const canProceed = await checkSubscription(msg);
    if (!canProceed) return;
    
    const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
    const emoji = result === 'Heads' ? '👑' : '🪙';
    await bot.sendMessage(chatId, `${emoji} Coin flip: *${result}*`, { parseMode: 'Markdown' });
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
            bot.emit('text', { chat: { id: chatId }, from: callbackQuery.from, text: '/help' });
            break;
            
        case 'about':
            bot.emit('text', { chat: { id: chatId }, from: callbackQuery.from, text: '/about' });
            break;
            
        case 'report':
            bot.emit('text', { chat: { id: chatId }, from: callbackQuery.from, text: '/report' });
            break;
            
        case 'football':
            await bot.sendMessage(chatId, "⚽ *FOOTBALL COMMANDS*\n\n/eplstandings\n/eplmatches\n/eplscorers\n/laligastandings\n/serieastandings\n/clstandings", { parseMode: 'Markdown' });
            break;
            
        case 'games':
            await bot.sendMessage(chatId, "🎮 *GAMES MENU*\n\n/rps - Rock Paper Scissors\n/trivia - Trivia Game\n/number - Guess Number\n/joke - Random Joke\n/8ball - Magic 8-Ball\n/quiz - Mini Quiz\n/ship - Compatibility Test", { parseMode: 'Markdown' });
            break;
            
        case 'tools':
            await bot.sendMessage(chatId, "🛠️ *TOOLS MENU*\n\n/qrcode <text>\n/tinyurl <url>\n/genpass\n/calculate <exp>\n/sticker\n/json <text>\n/ip <address>\n/password", { parseMode: 'Markdown' });
            break;
            
        case 'money':
            await bot.sendMessage(chatId, "💰 *MONEY MENU*\n\n/crypto - Crypto prices\n/rate <currency>\n/earn - Make money online\n/airtime - Buy airtime\n/data - Cheap data plans", { parseMode: 'Markdown' });
            break;
            
        case 'movie':
            await bot.sendMessage(chatId, "🎬 Send: `/movie <name>`\n\nExample: `/movie inception`", { parseMode: 'Markdown' });
            break;
            
        case 'song':
            await bot.sendMessage(chatId, "🎵 Send: `/song <name>`\n\nExample: `/song shape of you`", { parseMode: 'Markdown' });
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
            await bot.editMessageText(`🎮 *ROCK PAPER SCISSORS*\n\nYou: ${userChoice}\nBot: ${botChoice}\n\n${result}`, {
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
        await bot.sendMessage(chatId, `🎉 *CORRECT!* 🎉\n\nThe number was ${game.secret}!\nYou guessed it in ${game.attempts} attempts!`, { parseMode: 'Markdown' });
    } else if (guess < game.secret) {
        await bot.sendMessage(chatId, `📈 Too low! (Attempts: ${game.attempts})`);
    } else {
        await bot.sendMessage(chatId, `📉 Too high! (Attempts: ${game.attempts})`);
    }
});

// ============================================
// QUIZ ANSWER HANDLER
// ============================================
bot.onText(/^(A|B|C|D|Paris|42|Leonardo da Vinci|Pacific Ocean)$/i, async (msg, match) => {
    const chatId = msg.chat.id;
    const answer = match[1].toLowerCase();
    
    if (answer === 'paris' || answer === 'b') {
        await bot.sendMessage(chatId, "✅ *CORRECT!* Paris is the capital of France! 🎉", { parseMode: 'Markdown' });
    } else if (answer === '42' || answer === '42') {
        await bot.sendMessage(chatId, "✅ *CORRECT!* 15 + 27 = 42! 🎉", { parseMode: 'Markdown' });
    } else if (answer === 'leonardo da vinci' || answer === 'c') {
        await bot.sendMessage(chatId, "✅ *CORRECT!* Leonardo da Vinci painted the Mona Lisa! 🎉", { parseMode: 'Markdown' });
    } else if (answer === 'pacific ocean' || answer === 'd') {
        await bot.sendMessage(chatId, "✅ *CORRECT!* The Pacific Ocean is the largest! 🎉", { parseMode: 'Markdown' });
    }
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🚀 SHADOW MD Bot running on port ${PORT}`);
    console.log(`✅ Bot started at: ${new Date().toLocaleString()}`);
    
    const webhookUrl = `https://shadow-md-incredible-creativity.up.railway.app/webhook/${token}`;
    try {
        await bot.setWebHook(webhookUrl);
        console.log(`✅ Webhook set to: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Webhook error:', error.message);
    }
});