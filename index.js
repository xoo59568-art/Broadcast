require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const express = require("express");

/* ===== EXPRESS SERVER (RENDER + UPTIME) ===== */

const app = express();

app.get("/", (req, res) => {
  res.send("🐰 Rabbit XMD Bot Running ✅");
});

app.listen(3000, () => {
  console.log("🌐 Web Server Running");
});

/* ===== TELEGRAM BOT SETUP ===== */

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const ADMIN_ID = Number(process.env.ADMIN_ID);
const DB_GROUP = Number(process.env.DB_GROUP);

/* ===== ADVANCED USER SAVE ===== */

async function saveUser(msg) {

  const user = msg.from;

  const text = `
👤 New User Saved

🆔 ID: ${user.id}
📛 Name: ${user.first_name || ""} ${user.last_name || ""}
🔗 Username: ${user.username ? "@" + user.username : "No Username"}
📅 Join: ${new Date().toLocaleDateString()}
`;

  try {
    await bot.sendMessage(DB_GROUP, text);
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

  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {
    await saveUser(msg);
  }

  bot.sendMessage(msg.chat.id, `
🐰 Welcome to Rabbit XMD Support Bot

Hello! Welcome to the official support bot of Rabbit XMD. 👋  

📩 You can send any message, question, or issue here.  
Our support team will receive your message instantly and respond as soon as possible.

⚡ Need help with Rabbit XMD?  
💬 Want to report a problem?  
📢 Have suggestions or feedback?  

Just send a message — we’re here to help!

Thank you for using Rabbit XMD 💫
  `);

});

/* ===== USER MESSAGE → ADMIN ===== */

bot.on("message", async (msg) => {

  const userId = msg.from.id;

  if (userId !== ADMIN_ID) {

    await saveUser(msg);

    return bot.forwardMessage(
      ADMIN_ID,
      msg.chat.id,
      msg.message_id
    );
  }
});

/* ===== BROADCAST SYSTEM ===== */

bot.onText(/\/broadcast/, async (msg) => {

  if (msg.from.id !== ADMIN_ID) return;

  bot.sendMessage(msg.chat.id, "📤 Reply / Forward anything to broadcast");

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

  bot.sendMessage(
    msg.chat.id,
    `👥 Total Users: ${users.length}`
  );

});

/* ===== CHAT / GROUP ID CHECK ===== */

bot.onText(/\/id/, (msg) => {
  bot.sendMessage(msg.chat.id, `🆔 Chat ID: ${msg.chat.id}`);
});
