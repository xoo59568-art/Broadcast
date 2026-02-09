require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

/* ===== EXPRESS SERVER (Render + Uptime) ===== */

const app = express();

app.get("/", (req, res) => {
  res.send("Rabbit XMD Bot Running ✅");
});

app.listen(3000, () => {
  console.log("Web Server Running");
});

/* ===== TELEGRAM BOT SETUP ===== */

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

const ADMIN_ID = Number(process.env.ADMIN_ID);
const DB_GROUP = Number(process.env.DB_GROUP);

/* ===== USER SAVE TO GROUP ===== */

async function saveUser(msg) {

  const user = msg.from;

  const text = `
👤 New User

🆔 ID: ${user.id}
📛 Name: ${user.first_name || ""} ${user.last_name || ""}
🔗 Username: ${user.username ? "@" + user.username : "No Username"}
`;

  try {
    await bot.sendMessage(DB_GROUP, text);
  } catch (err) {
    console.log("Save Error:", err.message);
  }
}

/* ===== START COMMAND ===== */

bot.onText(/\/start/, async (msg) => {

  if (msg.from.id !== ADMIN_ID) {
    await saveUser(msg);
  }

  bot.sendMessage(msg.chat.id, `
🐰 Welcome to Rabbit XMD Support Bot

Send any message here.
Admin will reply soon.
`);
});

/* ===== USER MESSAGE → ADMIN ===== */

bot.on("message", async (msg) => {

  const userId = msg.from.id;

  // Admin message ignore
  if (userId === ADMIN_ID) return;

  // Save user
  await saveUser(msg);

  // Forward to admin
  try {
    await bot.forwardMessage(
      ADMIN_ID,
      msg.chat.id,
      msg.message_id
    );
  } catch (err) {
    console.log("Forward Error:", err.message);
  }
});

/* ===== BROADCAST COMMAND ===== */

bot.onText(/\/broadcast/, async (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id, "Reply any message to broadcast");

  bot.once("message", async (replyMsg) => {

    if (replyMsg.from.id !== ADMIN_ID) return;

    try {

      const messages = await bot.getChat(DB_GROUP);
      const history = await bot.getUpdates();

      let users = [];

      history.forEach(u => {
        if (u.message && u.message.chat.id === DB_GROUP) {

          const match = u.message.text?.match(/ID:\s*(\d+)/);
          if (match) users.push(Number(match[1]));

        }
      });

      users = [...new Set(users)];

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

    } catch (err) {
      console.log(err);
    }

  });

});

/* ===== USER COUNT ===== */

bot.onText(/\/usercount/, async (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  const history = await bot.getUpdates();
  let users = [];

  history.forEach(u => {
    if (u.message && u.message.chat.id === DB_GROUP) {

      const match = u.message.text?.match(/ID:\s*(\d+)/);
      if (match) users.push(Number(match[1]));

    }
  });

  users = [...new Set(users)];

  bot.sendMessage(msg.chat.id, `👥 Total Users: ${users.length}`);
});

/* ===== CHAT ID CHECK ===== */

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `Chat ID: ${msg.chat.id}`);
});
