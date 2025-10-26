// === Anonymous Telegram Relay Bot (Polling) ===
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); // Load environment variables

// Load from .env
const TOKEN = process.env.BOT_TOKEN; // Your bot token
const ADMIN_GROUP_ID = parseInt(process.env.ADMIN_GROUP_ID); // e.g., -123456789

if (!TOKEN || !ADMIN_GROUP_ID) {
  console.error('❌ BOT_TOKEN or ADMIN_GROUP_ID missing in .env');
  process.exit(1);
}

// Create bot in polling mode
const bot = new TelegramBot(TOKEN, { polling: true });

// Map to track which admin message corresponds to which user
const userMap = new Map();

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Ignore bot messages
  if (msg.from.is_bot) return;

  // === Admin group reply handling ===
  if (chatId === ADMIN_GROUP_ID && msg.reply_to_message) {
    const userId = userMap.get(msg.reply_to_message.message_id);
    if (userId) {
      try {
        await bot.sendMessage(userId, `💬 Admin reply:\n${msg.text}`);
        console.log(`✅ Reply sent to user ${userId}`);
      } catch (err) {
        console.error('Error sending reply:', err.message);
      }
    }
    return; // stop further processing
  }

  // === Forward user message to admin group ===
  if (chatId !== ADMIN_GROUP_ID) {
    const username = msg.from.username || msg.from.first_name || 'Unknown';
    const text = msg.text || '[Non-text message]';

    try {
      const sent = await bot.sendMessage(
        ADMIN_GROUP_ID,
        `📩 Message from @${username} (ID: ${chatId}):\n\n${text}`
      );
      // Map admin message → user
      userMap.set(sent.message_id, chatId);
      console.log(`📩 Message from ${chatId} forwarded to admin group.`);
    } catch (err) {
      console.error('Error forwarding message:', err.message);
    }
  }
});

// Handle polling errors
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.code, err.message);
});

console.log('🤖 Bot is running locally in polling mode...');
