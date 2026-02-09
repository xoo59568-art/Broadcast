require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

/* ===== EXPRESS SERVER ===== */

const app = express();

app.get("/", (req, res) => {
  res.send("Rabbit XMD Bot Running ✅");
});

app.listen(3000);

/* ===== BOT SETUP ===== */

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

const ADMIN_ID = Number(process.env.ADMIN_ID);
const DB_GROUP = Number(process.env.DB_GROUP);

/* ===== SAVE USER (GROUP DATABASE) ===== */

async function saveUser(user) {
  try {
    await bot.sendMessage(DB_GROUP, `ID: ${user.id}`);
  } catch {}
}

/* ===== GET USERS FROM GROUP ===== */

async function getUsers() {

  const updates = await bot.getUpdates();
  let users = [];

  updates.forEach(u => {
    if (u.message && u.message.chat.id === DB_GROUP) {

      const match = u.message.text?.match(/ID:\s*(\d+)/);
      if (match) users.push(Number(match[1]));

    }
  });

  return [...new Set(users)];
}

/* ===== START MESSAGE ===== */

bot.onText(/\/start/, async (msg) => {

  await saveUser(msg.from);

  bot.sendMessage(msg.chat.id, `
🐰 Welcome to Rabbit XMD Support Bot

Send any message to contact admin.
`);
});

/* ===== USER MESSAGE → ADMIN ===== */

bot.on("message", async (msg) => {

  if (msg.from.id === ADMIN_ID) return;

  await saveUser(msg.from);

  bot.forwardMessage(
    ADMIN_ID,
    msg.chat.id,
    msg.message_id
  );
});

/* ===== ADMIN REPLY → USER (ALL MEDIA) ===== */

bot.on("message", async (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  if (!msg.reply_to_message) return;

  const userId = msg.reply_to_message.forward_from?.id;
  if (!userId) return;

  try {
    await bot.copyMessage(
      userId,
      msg.chat.id,
      msg.message_id
    );
  } catch {}
});

/* ===== BROADCAST SYSTEM ===== */

bot.onText(/\/broadcast/, async (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id, "Reply or forward message to broadcast");

  bot.once("message", async (replyMsg) => {

    if (replyMsg.from.id !== ADMIN_ID) return;

    const users = await getUsers();

    for (let id of users) {
      try {
        await bot.copyMessage(
          id,
          replyMsg.chat.id,
          replyMsg.message_id
        );
      } catch {}
    }

    bot.sendMessage(msg.chat.id, "✅ Broadcast Completed");
  });

});

/* ===== USER COUNT ===== */

bot.onText(/\/usercount/, async (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  const users = await getUsers();

  bot.sendMessage(msg.chat.id, `👥 Total Users: ${users.length}`);
});

/* ===== CHAT / GROUP ID CHECK ===== */

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 Chat ID: ${msg.chat.id}`);
});

/* ===== ERROR PROTECTION ===== */

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
