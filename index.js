const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

// 🔧 CONFIG — EDIT THESE
const BOT_ID = '8846a62e10e090cb28b4582a19';
const OWNER_USER_ID = '122993150'; // your GroupMe user ID
const OWNER_NAME = '@Mira (Reviewer)'; // just display text

// 🧠 MEMORY
let userStates = {};
let applications = {};

// 📜 TERMS & CONDITIONS
const TERMS = `📜 MEME STEALING LICENSE AGREEMENT (MSLA v1.4)

Before proceeding, you must review and accept the following legally-questionable terms:

1. This Meme Stealing License (MSL) grants the holder limited, non-exclusive, non-transferable meme stealing privileges.

2. Meme theft is permitted for:
   - Personal amusement
   - Group chat distribution
   - Mild flexing purposes

3. Meme quality is the sole responsibility of the license holder.
Repeated posting of unfunny, outdated, or cringe memes may result in:
   - Temporary suspension
   - Permanent revocation
   - Public shaming

4. Cross-chat meme redistribution WITHOUT proper licensing is strictly prohibited.
(Yes, we WILL know.)

5. This license does NOT guarantee:
   - Originality
   - Laughs
   - Respect

6. Meme privileges may be revoked at any time for any reason.

7. By accepting, you agree to the sacred code:
"If it's funny, it's mine."

━━━━━━━━━━━━━━━━━━━━━━

Do you accept these terms?

Reply with:
#accept ✅
or
#deny ❌`;

// ❓ QUESTIONS
const questions = [
  "State your full name for the Meme Registry.",
  "State your gender.",
  "State your current occupation (or \"professional memer\" if unemployed).",
  "Why do you believe you deserve meme stealing privileges?",
  "Describe your sense of humor in one sentence.",
  "What is your favorite type of meme to steal?",
  "On average, how many memes do you consume per day?",
  "Have you ever stolen a meme without permission before?",
  "If yes, explain. If no, explain why you are lying.",
  "How would you handle posting a meme that gets no reactions?",
  "What would you do if someone reposts YOUR stolen meme?",
  "Choose one:\nA) Quantity\nB) Quality\nC) Whatever gets laughs",
  "Rate your meme taste from 1–10.",
  "Submit your best short joke or meme idea.",
  "Final question: Are you funny? Defend your answer."
];

// 📤 SEND MESSAGE (with optional mention)
function sendMessage(text, mention = false) {
  let data = {
    bot_id: BOT_ID,
    text: text
  };

  if (mention) {
    data.attachments = [{
      type: "mentions",
      loci: [[0, OWNER_NAME.length]],
      user_ids: [OWNER_USER_ID]
    }];
  }

  return axios.post('https://api.groupme.com/v3/bots/post', data);
}

// 🚀 MAIN WEBHOOK
app.post('/', async (req, res) => {
  const message = req.body.text;
  const user = req.body.sender_id;

  if (!message) return res.sendStatus(200);

  const msg = message.toLowerCase();

  // 🟢 START
  if (msg === "#start") {
    userStates[user] = "terms";
    return sendMessage(TERMS);
  }

  // ✅ ACCEPT / ❌ DENY
  if (userStates[user] === "terms") {
    if (msg === "#accept") {
      userStates[user] = "awaiting_photo";
      return sendMessage("📸 Please send your photo for your Meme License.\n\nAfter sending it, type: photo sent");
    }

    if (msg === "#deny") {
      userStates[user] = null;
      return sendMessage("🚫 Okay then… why are you even here? Skedaddle.");
    }
  }

  // 📸 PHOTO STEP
  if (userStates[user] === "awaiting_photo" && msg === "photo sent") {
    userStates[user] = "waiting_review";

    return sendMessage(
      `${OWNER_NAME} 📥 New applicant photo submitted.\n\n📨 Sending to upper management...\nPlease wait patiently.`,
      true
    );
  }

  // 🧑‍💼 OWNER APPROVES
  if (msg === "#reviewed") {
    for (let u in userStates) {
      if (userStates[u] === "waiting_review") {
        userStates[u] = "question_0";
        applications[u] = [];

        sendMessage("✅ Photo approved. Beginning interview...");
        sendMessage(questions[0]);
      }
    }
  }

  // ❓ QUESTION FLOW
  if (userStates[user] && userStates[user].startsWith("question_")) {
    let index = parseInt(userStates[user].split("_")[1]);

    // Save answer
    applications[user].push({
      question: questions[index],
      answer: message
    });

    index++;

    // Next question
    if (index < questions.length) {
      userStates[user] = `question_${index}`;
      return sendMessage(questions[index]);
    }

    // 🧾 FINISHED INTERVIEW
    userStates[user] = "done";

    let summary = "📋 MEME LICENSE APPLICATION\n━━━━━━━━━━━━━━━━━━━━━━\n\n";

    applications[user].forEach((item, i) => {
      summary += `Q${i + 1}: ${item.question}\nA: ${item.answer}\n\n`;
    });

    summary += "━━━━━━━━━━━━━━━━━━━━━━\n⏳ Your application is under review.\nPlease wait 2–3 business minutes.";

    sendMessage(summary);

    return sendMessage(
      `${OWNER_NAME} 📬 New application ready for review.`,
      true
    );
  }

  res.sendStatus(200);
});

// 🌐 START SERVER
app.listen(process.env.PORT || 3000, () => {
  console.log("Meme License Bot is running...");
});
