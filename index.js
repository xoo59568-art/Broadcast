require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

const app = express();
app.get("/", (req, res) => res.send("Rabbit XMD Bot Running"));
app.listen(3000);

/* ===== BOT SETUP ===== */

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = Number(process.env.ADMIN_ID);
const DB_GROUP = Number(process.env.DB_GROUP);

/* ===== USER CACHE ===== */

let users = new Set();

/* ===== LOAD USERS FROM GROUP ===== */

async function loadUsers() {

  try {
    const updates = await bot.getUpdates();

    updates.forEach(u => {
      if (u.message && u.message.chat.id === DB_GROUP) {

        const match = u.message.text?.match(/ID:\s*(\d+)/);
        if (match) users.add(Number(match[1]));

      }
    });

    console.log("Loaded Users:", users.size);

  } catch (err) {
    console.log("Load Error:", err.message);
  }
}

loadUsers();

/* ===== SAVE USER ===== */

async function saveUser(user) {

  if (users.has(user.id)) return;

  users.add(user.id);

  try {
    await bot.sendMessage(DB_GROUP, `ID: ${user.id}`);
  } catch {}
}

/* ===== START MESSAGE ===== */

bot.onText(/\/start/, async (msg) => {

  await saveUser(msg.from);

  bot.sendMessage(msg.chat.id,
    "🐰 Welcome to Rabbit XMD Support Bot\nSend message to contact admin."
  );
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

  bot.sendMessage(msg.chat.id, "Reply message to broadcast");

  bot.once("message", async (replyMsg) => {

    if (replyMsg.from.id !== ADMIN_ID) return;

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

bot.onText(/\/usercount/, (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id,
    `👥 Total Users: ${users.size}`
  );
});

/* ===== CHAT ID CHECK ===== */

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 Chat ID: ${msg.chat.id}`);
});

/* ===== ERROR PROTECTION ===== */

process.on("uncaughtException", console.error);
process.on("unhandledRejection", console.error);
