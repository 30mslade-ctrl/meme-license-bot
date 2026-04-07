const express = require("express");
const bodyParser = require("body-parser");
const https = require("https");

const app = express();
app.use(bodyParser.json());

// ===== CONFIG - EDIT THESE =====
const BOT_ID = "8846a62e10e090cb28b4582a19";
const OWNER_NAME = "@Mira(Reviewer)"; // EXACT display name (case sensitive)
const OWNER_ID = "122993150"; // your GroupMe user_id as a string

// ===== QUESTIONS =====
// Must include these first three exactly
const questions = [
  "State your full name.",
  "State your gender.",
  "State your occupation.",
  "Why do you want this Meme Stealing License? Be honest!",
  "What's your favorite type of meme to steal?",
  "How would you responsibly use memes in a group chat?",
  "If two people steal the same meme, how would you handle it?",
  "How often do you plan to steal memes per day? (Be realistic!)",
  "If a meme is painfully unfunny, what do you do with it?",
  "Final question: Are you cool? Defend your answer!"
];

// ===== MEMORY =====
// Sessions keyed by username to track interview progress
const sessions = {};

// ===== HELPER: Send message WITHOUT mention =====
function sendMessage(text) {
  const data = JSON.stringify({ bot_id: BOT_ID, text });
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
  req.write(data);
  req.end();
}

// ===== HELPER: Send message WITH mention to owner =====
function sendMessageWithMention(text, name, userId) {
  const mentionIndex = text.length + 1; // position where mention starts (after a space)
  const mentionLength = name.length + 1; // length of mention (including '@')

  const data = JSON.stringify({
    bot_id: BOT_ID,
    text: text + " @" + name,
    attachments: [
      {
        type: "mentions",
        loci: [[mentionIndex, mentionLength]],
        user_ids: [userId]
      }
    ]
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
  req.write(data);
  req.end();
}

// ===== ROUTE: Handle incoming messages =====
app.post("/", (req, res) => {
  const textRaw = req.body.text || "";
  const text = textRaw.trim().toLowerCase();
  const user = req.body.name;
  const attachments = req.body.attachments || [];
  const hasImage = attachments.some(att => att.type === "image");

  if (!sessions[user]) {
    // Initialize session state for this user
    sessions[user] = {
      stage: "start", // stages: start -> terms -> waitingPhoto -> waitingReview -> interview -> done
      step: 0,
      answers: []
    };
  }

  const session = sessions[user];

  // === STAGE: START ===
  if (session.stage === "start") {
    sendMessage(
      `⚠️ Before continuing, please review the following Terms & Conditions for the Meme Stealing License:\n\n` +
        `1. You may use/steal memes only for personal and group chat use.\n` +
        `2. This license is non-exclusive and can be revoked at any time.\n` +
        `3. Meme quality is your responsibility. Overuse of unfunny memes may result in suspension.\n` +
        `4. This license does NOT guarantee originality.\n` +
        `5. Cross-chat usage is NOT allowed.\n` +
        `6. You may contact a meme licensor to reapply per chat.\n` +
        `7. Failure to comply may result in meme privileges being temporarily or permanently revoked.\n\n` +
        `If you agree, type #agree\n` +
        `If you deny, type #deny`
    );
    session.stage = "terms";
    return res.sendStatus(200);
  }

  // === STAGE: TERMS (wait for agree/deny) ===
  if (session.stage === "terms") {
    if (text === "#agree") {
      sendMessage(`👍 Okay ${user}, please upload a photo for your Meme Stealing License.`);
      session.stage = "waitingPhoto";
    } else if (text === "#deny") {
      sendMessage(
        `🚫 Oh, well, then why are you here in the first place? Skedaddle back to where you came from!`
      );
      delete sessions[user];
    } else {
      sendMessage(`Please respond with #agree to proceed or #deny to quit.`);
    }
    return res.sendStatus(200);
  }

  // === STAGE: WAITING FOR PHOTO ===
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

  // === OWNER COMMANDS ===
  // Only allow owner to approve or reject photos
  if (req.body.user_id === OWNER_ID) {
    if (text === "#approve") {
      // Find a session waiting for review
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

    if (text === "#reject") {
      // Find a session waiting for review
      for (const u in sessions) {
        if (sessions[u].stage === "waitingReview") {
          sendMessage(
            `${u}, your photo has been rejected by upper management. Please upload a better photo or try again later.`
          );
          sessions[u].stage = "waitingPhoto";
          break;
        }
      }
      return res.sendStatus(200);
    }
  }

  // === STAGE: INTERVIEW ===
  if (session.stage === "interview") {
    // Record answer for current question
    session.answers.push({
      question: questions[session.step],
      answer: req.body.text || "(No answer given)"
    });

    session.step++;

    if (session.step < questions.length) {
      // Ask next question
      sendMessage(questions[session.step]);
    } else {
      // Interview finished
      let summary = `📄 FULL APPLICATION - ${user} 📄\n\n`;
      session.answers.forEach((qa, i) => {
        summary += `Q${i + 1}: ${qa.question}\nA: ${qa.answer}\n\n`;
      });
      summary += `Application submitted. Please wait 2–3 business minutes.`;
      sendMessageWithMention(summary, OWNER_NAME, OWNER_ID);
      // Clear session
      delete sessions[user];
    }
    return res.sendStatus(200);
  }

  // Catch-all: For all other messages, ignore or remind user
  return res.sendStatus(200);
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Bot running on port ${PORT}`));
