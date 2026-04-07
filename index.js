const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");

const app = express();
app.use(bodyParser.json());

// ===== CONFIG =====
const BOT_ID = "8846a62e10e090cb28b4582a19"; // replace with your bot ID
const OWNER_TAG = "@Mira(Reviewer)"; // exact display name

// ===== MEMORY =====
let users = {};

// ===== SEND MESSAGE =====
function sendMessage(text) {
  const data = JSON.stringify({
    bot_id: BOT_ID,
    text: text
  });

  const options = {
    hostname: "api.groupme.com",
    path: "/v3/bots/post",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": data.length
    }
  };

  const req = https.request(options);
  req.on("error", () => {});
  req.write(data);
  req.end();
}

// ===== #START COMMAND =====
  if (text.toLowerCase() === "#start") {
    u.started = true;
    u.stage = "terms";

    sendMessage(
      `⚠️ Welcome to the Meme Stealing License process! ⚠️\n\n` +
      `Before you proceed, please review and consent to the following Terms & Conditions:\n\n` +
      `1. You may use/steal memes only for personal and group chat use.\n` +
      `2. This license is non-exclusive and can be revoked at any time.\n` +
      `3. Meme quality is your responsibility. Overuse of unfunny memes may result in suspension.\n` +
      `4. This license does NOT guarantee originality.\n` +
      `5. Cross-chat usage is strictly forbidden.\n` +
      `6. Reapply per chat if needed.\n` +
      `7. Failure to comply may result in temporary or permanent revocation of meme privileges.\n\n` +
      `Do you consent to these terms?\n\n` +
      `✅ If you agree, type #agree\n❌ If you do NOT agree, type #deny`
    );
    return res.sendStatus(200);
  }


// ===== QUESTIONS =====
const questions = [
  "State your full name.",
  "State your gender.",
  "State your occupation.",
  "Why are you applying for a Meme Stealing License at this time?",
  "Describe your sense of humor in 3 words.",
  "What is your primary meme source?",
  "How many memes do you realistically plan to steal per day?",
  "What would you do if your meme gets ignored?",
  "If someone sends the same meme as you, what do you do?",
  "Define 'too far' in meme culture.",
  "What is one meme you refuse to steal?",
  "You find a top-tier meme. What is your first move?",
  "How do you respond to being called unfunny?",
  "Rate your humor under pressure (1–10).",
  "Are you original, or just a redistributor?",
  "Final question: Why should we trust you with meme privileges?"
];

// ===== REJECTION MESSAGES =====
const rejectionMessages = [
  "After careful review, your application has been denied due to insufficient comedic ability.",
  "Application rejected. Reason: You did not meet the Funny Standard™.",
  "We regret to inform you that your meme privileges have been denied indefinitely.",
  "Application denied. Please take time to reflect on your humor.",
  "Rejected. The council found your vibe questionable.",
  "Application status: DENIED.\nReason: Not funny enough under pressure.",
  "We reviewed your application and immediately said no.",
  "Denied. Please reapply after gaining personality.",
  "Application rejected for crimes against comedy.",
  "Unfortunately, this is not your arc."
];

// ===== MAIN ROUTE =====
app.post("/", (req, res) => {
  const text = req.body.text;
  const user = req.body.name;

  if (!text || !user) return res.sendStatus(200);

  if (!users[user]) {
    users[user] = {
      started: false,
      stage: "none", // none, photo, waiting, interview
      step: 0,
      answers: []
    };
  }

  const u = users[user];

  // ===== TERMS AGREEMENT =====
  if (text.toLowerCase() === "#agree" && u.stage === "terms") {
    u.stage = "photo";
    sendMessage(`${user}, thank you for agreeing! Please submit a photo for your Meme Stealing License.\nThen type: #photo_sent`);
    return res.sendStatus(200);
  }

  if (text.toLowerCase() === "#deny" && u.stage === "terms") {
    sendMessage(`🚫 Oh, then why are you here in the first place? Skedaddle back to where you came from!`);
    u.stage = "none"; // reset the stage
    return res.sendStatus(200);
  }

  // ===== PHOTO =====
  if (text.toLowerCase() === "#photo_sent" && u.stage === "photo") {
    u.stage = "waiting";

    sendMessage(`Photo received. Submitting to upper management.\nPlease wait patiently.\n\n${OWNER_TAG}`);
    return res.sendStatus(200);
  }

  // ===== APPROVE =====
  if (text.toLowerCase() === "#approve") {
    for (let name in users) {
      if (users[name].stage === "waiting") {
        users[name].stage = "interview";
        users[name].step = 0;

        sendMessage(`${name}, your photo has been approved. Beginning interview.`);
        sendMessage(questions[0]);
        break;
      }
    }
    return res.sendStatus(200);
  }

  // ===== REJECT =====
  if (text.toLowerCase() === "#reject") {
    for (let name in users) {
      if (users[name].stage === "waiting" || users[name].stage === "interview") {
        const randomMessage = rejectionMessages[Math.floor(Math.random() * rejectionMessages.length)];
        sendMessage(`🚫 APPLICATION DENIED: ${name} 🚫\n\n${randomMessage}\n\nYou may reapply at a later time.\n\n${OWNER_TAG}`);
        users[name].stage = "none"; // reset stage
        break;
      }
    }
    return res.sendStatus(200);
  }

  // ===== INTERVIEW =====
  if (u.stage === "interview") {
    u.answers.push({
      question: questions[u.step],
      answer: text
    });

    u.step++;

    if (u.step < questions.length) {
      sendMessage(questions[u.step]);
    } else {
      let summary = `📄 FULL APPLICATION: ${user} 📄\n\n`;

      u.answers.forEach((qa, i) => {
        summary += `Q${i + 1}: ${qa.question}\nA: ${qa.answer}\n\n`;
      });

      summary += `Application submitted for review.\nPlease wait 2–3 business minutes.\n\n${OWNER_TAG}`;

      sendMessage(summary);

      // Reset user to "waiting" so they can be rejected after interview if needed
      users[user].stage = "waiting";
    }

    return res.sendStatus(200);
  }

  res.sendStatus(200); // fallback
});

// ===== SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Bot running on port " + PORT);
});
