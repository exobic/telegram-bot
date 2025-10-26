// === Anonymous Telegram Relay Bot with Media Support (Polling) ===
const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config(); // Load environment variables

const TOKEN = process.env.BOT_TOKEN;
const ADMIN_GROUP_ID = parseInt(process.env.ADMIN_GROUP_ID);

if (!TOKEN || !ADMIN_GROUP_ID) {
  console.error('❌ BOT_TOKEN or ADMIN_GROUP_ID missing in .env');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });
const userMap = new Map();

// Helper function to forward any type of message
async function forwardMessageToAdmin(msg) {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name || 'Unknown';

  try {
    let sent;

    if (msg.text) {
      // Text message
      sent = await bot.sendMessage(
        ADMIN_GROUP_ID,
        `📩 Message from @${username} (ID: ${chatId}):\n\n${msg.text}`
      );
    } else if (msg.photo) {
      // Photo(s)
      const largestPhoto = msg.photo[msg.photo.length - 1].file_id;
      sent = await bot.sendPhoto(
        ADMIN_GROUP_ID,
        largestPhoto,
        { caption: `📩 Photo from @${username} (ID: ${chatId})\n${msg.caption || ''}` }
      );
    } else if (msg.sticker) {
      sent = await bot.sendSticker(ADMIN_GROUP_ID, msg.sticker.file_id);
    } else if (msg.document) {
      sent = await bot.sendDocument(
        ADMIN_GROUP_ID,
        msg.document.file_id,
        { caption: `📩 Document from @${username} (ID: ${chatId})\n${msg.caption || ''}` }
      );
    } else if (msg.audio) {
      sent = await bot.sendAudio(ADMIN_GROUP_ID, msg.audio.file_id, { caption: msg.caption || '' });
    } else if (msg.voice) {
      sent = await bot.sendVoice(ADMIN_GROUP_ID, msg.voice.file_id, { caption: msg.caption || '' });
    } else if (msg.video) {
      sent = await bot.sendVideo(ADMIN_GROUP_ID, msg.video.file_id, { caption: msg.caption || '' });
    } else {
      // Unknown or unsupported type
      sent = await bot.sendMessage(
        ADMIN_GROUP_ID,
        `📩 Message from @${username} (ID: ${chatId})\n[Unsupported message type]`
      );
    }

    // Map admin message → user
    if (sent && sent.message_id) userMap.set(sent.message_id, chatId);
    console.log(`📩 Message from ${chatId} forwarded to admin group.`);
  } catch (err) {
    console.error('Error forwarding message:', err.message);
  }
}

// Helper function to forward admin replies to user
async function forwardReplyToUser(msg) {
  const replyToId = msg.reply_to_message.message_id;
  const userId = userMap.get(replyToId);
  if (!userId) return;

  try {
    if (msg.text) {
      await bot.sendMessage(userId, `💬 Admin reply:\n${msg.text}`);
    } else if (msg.photo) {
      const largestPhoto = msg.photo[msg.photo.length - 1].file_id;
      await bot.sendPhoto(userId, largestPhoto, { caption: msg.caption || '' });
    } else if (msg.sticker) {
      await bot.sendSticker(userId, msg.sticker.file_id);
    } else if (msg.document) {
      await bot.sendDocument(userId, msg.document.file_id, { caption: msg.caption || '' });
    } else if (msg.audio) {
      await bot.sendAudio(userId, msg.audio.file_id, { caption: msg.caption || '' });
    } else if (msg.voice) {
      await bot.sendVoice(userId, msg.voice.file_id, { caption: msg.caption || '' });
    } else if (msg.video) {
      await bot.sendVideo(userId, msg.video.file_id, { caption: msg.caption || '' });
    } else {
      await bot.sendMessage(userId, '[Admin sent unsupported message type]');
    }
    console.log(`✅ Admin reply sent to user ${userId}`);
  } catch (err) {
    console.error('Error sending admin reply:', err.message);
  }
}

// Single listener for all messages
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;

  // Ignore bot messages
  if (msg.from.is_bot) return;

  // Admin reply
  if (chatId === ADMIN_GROUP_ID && msg.reply_to_message) {
    await forwardReplyToUser(msg);
    return;
  }

  // User message
  if (chatId !== ADMIN_GROUP_ID) {
    await forwardMessageToAdmin(msg);
  }
});

// Handle polling errors
bot.on('polling_error', (err) => {
  console.error('Polling error:', err.code, err.message);
});

console.log('🤖 Anonymous relay bot running locally with media support...');
