const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");

const app = express();
app.use(bodyParser.json());

// ===== CONFIG =====
const BOT_ID = "8846a62e10e090cb28b4582a19";
const OWNER_NAME = "Mira(Reviewer)";
const OWNER_ID = "122993150";

// ===== INTERVIEW QUESTIONS =====
const questions = [
  "State your full name.",
  "State your gender.",
  "State your occupation.",
  "Explain why memes are essential to modern society.",
  "Describe your strategy for responsibly stealing memes.",
  "What safeguards would you implement to prevent meme overuse?",
  "If another licensor contests a meme you posted, how do you respond?",
  "Quantify your daily meme quota.",
  "Describe the most egregious meme crime you have witnessed.",
  "How do you handle a meme that goes viral without credit?",
  "Explain your philosophy on meme originality.",
  "Final question: Defend why you are trustworthy enough to steal memes."
];

// ===== MEMORY =====
const sessions = {};

// ===== HELPER FUNCTIONS =====
function sendMessage(text) {
  const data = JSON.stringify({ bot_id: BOT_ID, text });
  const options = {
    hostname: "api.groupme.com",
    path: "/v3/bots/post",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": data.length }
  };
  const req = https.request(options);
  req.write(data);
  req.end();
}

function sendMessageWithMention(text, name, userId) {
  const mentionIndex = text.length + 1;
  const mentionLength = name.length + 1;
  const data = JSON.stringify({
    bot_id: BOT_ID,
    text: text + " @" + name,
    attachments: [{ type: "mentions", loci: [[mentionIndex, mentionLength]], user_ids: [userId] }]
  });
  const options = {
    hostname: "api.groupme.com",
    path: "/v3/bots/post",
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": data.length }
  };
  const req = https.request(options);
  req.write(data);
  req.end();
}

// ===== MAIN ROUTE =====
app.post("/", (req, res) => {
  const textRaw = req.body.text || "";
  const user = req.body.name;
  const userId = req.body.user_id;
  const sender_type = req.body.sender_type || "";
  const attachments = req.body.attachments || [];
  const hasImage = attachments.some(att => att.type === "image");

  if (sender_type === "bot") return res.sendStatus(200);

  if (!sessions[user]) sessions[user] = { stage: "waitingStart", step: 0, answers: [] };
  const session = sessions[user];

  // ===== #START COMMAND =====
  if (session.stage === "waitingStart" && textRaw.trim().toLowerCase() === "#start") {
    sendMessage(
      `⚠️ Welcome to the Meme Stealing License process! ⚠️\n\n` +
      `Before you proceed, you must review and consent to the following Terms & Conditions:\n\n` +
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
    session.stage = "terms";
    return res.sendStatus(200);
  }

  // ===== TERMS AGREEMENT =====
  if (session.stage === "terms") {
    if (textRaw.trim().toLowerCase() === "#agree") {
      sendMessage(`${user}, thank you for agreeing! Please upload a photo for your Meme Stealing License.`);
      session.stage = "waitingPhoto";
    } else if (textRaw.trim().toLowerCase() === "#deny") {
      sendMessage(`🚫 Oh, then why are you here in the first place? Skedaddle back to where you came from!`);
      delete sessions[user];
    } else {
      sendMessage(`Please type #agree to proceed or #deny to quit.`);
    }
    return res.sendStatus(200);
  }

  // ===== WAITING FOR PHOTO =====
  if (session.stage === "waitingPhoto") {
    if (hasImage) {
      session.stage = "waitingReview";
      sendMessageWithMention(
        `${user} has uploaded their photo. Sending to upper management for review. Please wait patiently.`,
        OWNER_NAME,
        OWNER_ID
      );
    } else {
      sendMessage(`${user}, please upload a photo to proceed.`);
    }
    return res.sendStatus(200);
  }

  // ===== OWNER APPROVE / REJECT =====
  if (userId === OWNER_ID) {
    if (textRaw.trim().toLowerCase() === "#approve") {
      for (const u in sessions) {
        if (sessions[u].stage === "waitingReview") {
          sessions[u].stage = "interview";
          sessions[u].step = 0;
          sendMessage(`${u}, your photo has been approved. Beginning interview.`);
          sendMessage(questions[0]);
          break;
        }
      }
      return res.sendStatus(200);
    }
    if (textRaw.trim().toLowerCase() === "#reject") {
      for (const u in sessions) {
        if (sessions[u].stage === "waitingReview") {
          sendMessage(`${u}, your photo has been rejected by upper management. Please upload a better photo or try again later.`);
          sessions[u].stage = "waitingPhoto";
          break;
        }
      }
      return res.sendStatus(200);
    }
  }

  // ===== INTERVIEW =====
  if (session.stage === "interview") {
    session.answers.push({ question: questions[session.step], answer: textRaw || "(No answer given)" });
    session.step++;

    if (session.step < questions.length) {
      sendMessage(questions[session.step]);
    } else {
      let summary = `📄 FULL APPLICATION - ${user} 📄\n\n`;
      session.answers.forEach((qa, i) => {
        summary += `Q${i + 1}: ${qa.question}\nA: ${qa.answer}\n\n`;
      });
      summary += `Application submitted. Please wait 2–3 business minutes.`;
      sendMessageWithMention(summary, OWNER_NAME, OWNER_ID);
      delete sessions[user];
    }
    return res.sendStatus(200);
  }

  return res.sendStatus(200);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
