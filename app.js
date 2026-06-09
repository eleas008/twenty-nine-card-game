// Constants & Config Rules Mapping
const SUITS = ["♥", "♦", "♣", "♠"];
const VALUES = ["J", "9", "A", "10", "K", "Q", "8", "7"];
const POINTS = { J: 3, 9: 2, A: 1, 10: 1, K: 0, Q: 0, 8: 0, 7: 0 };
const RANKS = { J: 8, 9: 7, A: 6, 10: 5, K: 4, Q: 3, 8: 2, 7: 1 };
const SUIT_NAMES = {
  "♥": "hearts",
  "♦": "diamonds",
  "♣": "clubs",
  "♠": "spades",
};

// Core Game State Variables
let deck = [];
let players = [
  { name: "You", hand: [], team: "us" },
  { name: "AI-1", hand: [], team: "them" },
  { name: "AI-2 (Partner)", hand: [], team: "us" },
  { name: "AI-3", hand: [], team: "them" },
];

let matchScoreUs = 0;
let matchScoreThem = 0;

let currentBidder = -1;
let highestBid = 15;
let highestBidder = -1;
let activeBidTurn = 1;
let bidPassCount = 0;

let trumpSuit = "";
let isTrumpRevealed = false;
let trumpRevealer = -1;

let currentTrick = [];
let leadSuit = "";
let turnIndex = 1;
let trickCount = 0;

let pointsCollected = { us: 0, them: 0 };

// Initialization Setup Anchor Lifecycle Hook
window.onload = function () {
  logMessage("Welcome to 29! Dealing first phase cards...");
  startNewRound();
};

function startNewRound() {
  deck = [];
  players.forEach((p) => (p.hand = []));
  currentTrick = [];
  leadSuit = "";
  trickCount = 0;
  pointsCollected = { us: 0, them: 0 };
  highestBid = 15;
  highestBidder = -1;
  bidPassCount = 0;
  isTrumpRevealed = false;
  trumpSuit = "";
  document.getElementById("ask-trump-btn").disabled = true;
  updatePointsDisplay();

  buildDeck();
  shuffleDeck();
  dealPhase(4); // Deal initial 4 cards distribution parameters
  renderHands(true);
  initiateBidding();
}

function buildDeck() {
  for (let suit of SUITS) {
    for (let val of VALUES) {
      deck.push({
        suit: suit,
        value: val,
        points: POINTS[val],
        rank: RANKS[val],
      });
    }
  }
}

function shuffleDeck() {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function dealPhase(count) {
  for (let i = 0; i < 4; i++) {
    for (let c = 0; c < count; c++) {
      players[i].hand.push(deck.pop());
    }
  }
}

function renderHands(hideAI = true) {
  const userHandDiv = document.getElementById("user-hand");
  userHandDiv.innerHTML = "";

  // Render Active User Interactives
  players[0].hand
    .sort((a, b) => SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit))
    .forEach((card, index) => {
      const cardEl = createCardUI(card, false, index);
      cardEl.onclick = () => handleUserPlayCard(index);
      userHandDiv.appendChild(cardEl);
    });

  // Render Structural Mocks for Automated Back opponents
  for (let i = 1; i <= 3; i++) {
    const aiHandDiv = document.getElementById(`hand-${i}`);
    aiHandDiv.innerHTML = "";
    players[i].hand.forEach((card, index) => {
      aiHandDiv.appendChild(createCardUI(card, hideAI, index));
    });
  }
  updateTrumpUI();
}

function createCardUI(card, isBack, zIdx) {
  const div = document.createElement("div");
  if (isBack) {
    div.className = "card card-back";
    return div;
  }

  const suitClass = `suit-${SUIT_NAMES[card.suit]}`;
  div.className = `card ${suitClass}`;
  div.style.zIndex = zIdx;
  div.innerHTML = `
        <div class="top-left">${card.value}<br>${card.suit}</div>
        <div class="card-suit-center">${card.suit}</div>
        <div class="bottom-right">${card.value}<br>${card.suit}</div>
    `;
  return div;
}

// --- Auction Lifecycle Loops ---
function initiateBidding() {
  activeBidTurn = 0;
  showBidModal();
}

function showBidModal() {
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.getElementById("bid-modal").classList.remove("hidden");
  document.getElementById("current-highest-bid").innerText = highestBid;

  const btnGroup = document.getElementById("bid-buttons");
  btnGroup.innerHTML = "";

  let minBid = highestBid === 15 ? 16 : highestBid + 1;
  for (let b = minBid; b <= 28; b++) {
    const btn = document.createElement("button");
    btn.innerText = b;
    btn.onclick = () => submitBid(b);
    btnGroup.appendChild(btn);
  }
}

function submitBid(bidValue) {
  document.getElementById("bid-modal").classList.add("hidden");

  if (bidValue !== "pass") {
    highestBid = bidValue;
    highestBidder = 0;
    logMessage(`You bid ${bidValue}`);
  } else {
    bidPassCount++;
    logMessage(`You Passed`);
  }

  activeBidTurn = 1;
  setTimeout(aiBiddingLoop, 700);
}

function aiBiddingLoop() {
  if (bidPassCount >= 3 && highestBidder !== -1) {
    endBiddingPhase();
    return;
  }
  if (bidPassCount === 4) {
    highestBid = 16;
    highestBidder = 0;
    endBiddingPhase();
    return;
  }

  if (activeBidTurn === 0) {
    showBidModal();
    return;
  }

  let aiHand = players[activeBidTurn].hand;
  let countJacksNines = aiHand.filter(
    (c) => c.value === "J" || c.value === "9",
  ).length;
  let prospectiveBid = highestBid + 1;

  if (countJacksNines >= 2 && prospectiveBid <= 19) {
    highestBid = prospectiveBid;
    highestBidder = activeBidTurn;
    logMessage(`${players[activeBidTurn].name} bid ${highestBid}`);
  } else {
    bidPassCount++;
    logMessage(`${players[activeBidTurn].name} passed`);
  }

  activeBidTurn = (activeBidTurn + 1) % 4;
  setTimeout(aiBiddingLoop, 600);
}

function endBiddingPhase() {
  document.getElementById("modal-overlay").classList.add("hidden");
  document.getElementById("bid-winner-txt").innerText =
    players[highestBidder].name;
  document.getElementById("round-target").innerText = highestBid;
  logMessage(
    `Auction Won by ${players[highestBidder].name} with a bid of ${highestBid}`,
  );

  // Distribution Phase 2
  dealPhase(4);
  renderHands(true);

  if (highestBidder === 0) {
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("trump-modal").classList.remove("hidden");
  } else {
    let suitsOwned = players[highestBidder].hand.map((c) => c.suit);
    trumpSuit = suitsOwned
      .sort(
        (a, b) =>
          suitsOwned.filter((v) => v === a).length -
          suitsOwned.filter((v) => v === b).length,
      )
      .pop();
    logMessage(`${players[highestBidder].name} set the secret trump suit.`);
    startTricksPlay();
  }
}

function setTrump(suit) {
  trumpSuit = suit;
  document.getElementById("trump-modal").classList.add("hidden");
  document.getElementById("modal-overlay").classList.add("hidden");
  logMessage(`You selected ${suit} as your Secret Trump asset.`);
  startTricksPlay();
}

// --- Gameplay Mechanics Engine Loops ---
function startTricksPlay() {
  turnIndex = 0;
  document.getElementById("ask-trump-btn").disabled = false;
  document.getElementById("ask-trump-btn").onclick = () => requestTrumpReveal();
  evaluateTurnPillHighlight();
}

function evaluateTurnPillHighlight() {
  for (let i = 0; i < 4; i++) {
    document.getElementById(`badge-${i}`).classList.remove("active");
  }
  document.getElementById(`badge-${turnIndex}`).classList.add("active");

  if (turnIndex !== 0) {
    setTimeout(aiPlayTurn, 1000);
  }
}

function handleUserPlayCard(cardIndex) {
  if (turnIndex !== 0) return;

  let card = players[0].hand[cardIndex];

  if (leadSuit !== "" && card.suit !== leadSuit) {
    let hasLeadSuit = players[0].hand.some((c) => c.suit === leadSuit);
    if (hasLeadSuit) {
      alert("Illegal Move! You must follow suit if possible.");
      return;
    }
  }

  executeCardPlay(0, cardIndex);
}

function requestTrumpReveal() {
  if (isTrumpRevealed) return;
  isTrumpRevealed = true;
  trumpRevealer = turnIndex;
  logMessage(`📢 Trump revealed! The Trump suit is: **${trumpSuit}**`);
  updateTrumpUI();
  document.getElementById("ask-trump-btn").disabled = true;
}

function executeCardPlay(playerIdx, cardIdx) {
  let card = players[playerIdx].hand.splice(cardIdx, 1)[0];
  if (currentTrick.length === 0) {
    leadSuit = card.suit;
  }

  currentTrick.push({ player: playerIdx, card: card });

  const playedContainer = document.getElementById(`played-${playerIdx}`);
  playedContainer.innerHTML = "";
  playedContainer.appendChild(createCardUI(card, false, 1));

  renderHands(true);
  turnIndex = (turnIndex + 1) % 4;

  if (currentTrick.length === 4) {
    setTimeout(evaluateTrickWinner, 1200);
  } else {
    evaluateTurnPillHighlight();
  }
}

function aiPlayTurn() {
  let aiHand = players[turnIndex].hand;
  let playableIndex = 0;

  if (leadSuit !== "") {
    let followSuitIdx = aiHand.findIndex((c) => c.suit === leadSuit);
    if (followSuitIdx !== -1) {
      playableIndex = followSuitIdx;
    } else {
      if (!isTrumpRevealed) {
        requestTrumpReveal();
      }

      let trumpIdx = aiHand.findIndex((c) => c.suit === trumpSuit);
      if (trumpIdx !== -1 && isTrumpRevealed) {
        playableIndex = trumpIdx;
      } else {
        playableIndex = 0;
      }
    }
  } else {
    playableIndex = 0;
  }

  executeCardPlay(turnIndex, playableIndex);
}

function evaluateTrickWinner() {
  let highestRank = -1;
  let winningPlayer = -1;
  let trickPointsValue = 0;

  currentTrick.forEach((played) => {
    let card = played.card;
    trickPointsValue += card.points;

    let scoreRank = card.rank;
    if (isTrumpRevealed && card.suit === trumpSuit) {
      scoreRank += 20;
    } else if (card.suit !== leadSuit) {
      scoreRank = 0;
    }

    if (scoreRank > highestRank) {
      highestRank = scoreRank;
      winningPlayer = played.player;
    }
  });

  trickCount++;
  if (trickCount === 8) {
    trickPointsValue += 1;
    logMessage(
      `Last trick bonus (+1 pt) awarded to ${players[winningPlayer].name}`,
    );
  }

  let winnerTeam = players[winningPlayer].team;
  pointsCollected[winnerTeam] += trickPointsValue;

  logMessage(
    `🎯 ${players[winningPlayer].name} wins the trick (+${trickPointsValue} pts)`,
  );

  for (let i = 0; i < 4; i++) {
    document.getElementById(`played-${i}`).innerHTML = "";
  }

  currentTrick = [];
  leadSuit = "";
  turnIndex = winningPlayer;
  updatePointsDisplay();

  if (trickCount < 8) {
    evaluateTurnPillHighlight();
  } else {
    evaluateRoundResolution();
  }
}

function updatePointsDisplay() {
  document.getElementById("points-us").innerText = pointsCollected.us;
  document.getElementById("points-them").innerText = pointsCollected.them;
}

function updateTrumpUI() {
  const display = document.getElementById("trump-display");
  if (!isTrumpRevealed) {
    display.innerHTML = `<div class="trump-indicator hidden-trump">?</div>`;
  } else {
    let suitClass = `suit-${SUIT_NAMES[trumpSuit]}`;
    display.innerHTML = `<div class="trump-indicator ${suitClass}" style="color: ${trumpSuit === "♥" || trumpSuit === "♦" ? "red" : "black"}">${trumpSuit}</div>`;
  }
}

function evaluateRoundResolution() {
  let biddingTeam = players[highestBidder].team;
  let targetPoints = highestBid;
  let scoreAccumulated = pointsCollected[biddingTeam];

  logMessage(`--- Round Ended ---`);
  logMessage(`Bidders needed: ${targetPoints}, got: ${scoreAccumulated}`);

  if (scoreAccumulated >= targetPoints) {
    logMessage(`🎉 Bidding team won the round!`);
    if (biddingTeam === "us") matchScoreUs += 1;
    else matchScoreThem += 1;
  } else {
    logMessage(`❌ Bidding team failed to reach contract criteria target.`);
    if (biddingTeam === "us") matchScoreUs -= 1;
    else matchScoreThem -= 1;
  }

  document.getElementById("match-score").innerText =
    `Us ${matchScoreUs} - ${matchScoreThem} Them`;

  if (
    matchScoreUs >= 6 ||
    matchScoreThem >= 6 ||
    matchScoreUs <= -6 ||
    matchScoreThem <= -6
  ) {
    alert(
      `Game Over Match Complete! Final standings: Us ${matchScoreUs} to Them ${matchScoreThem}`,
    );
    matchScoreUs = 0;
    matchScoreThem = 0;
  }

  setTimeout(() => {
    alert("Prepare for Next Round Deal Hand");
    startNewRound();
  }, 3000);
}

function logMessage(msg) {
    const container = document.getElementById('log-container');
    if (!container) return;
    
    const el = document.createElement('div');
    el.innerHTML = msg;
    container.appendChild(el);
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });
}

function makeElementDraggable(modalElement) {
  let pos1 = 0,
    pos2 = 0,
    pos3 = 0,
    pos4 = 0;

  // Find the H2 heading inside the modal to act as the handle wrapper
  const handle = modalElement.querySelector("h2");

  if (handle) {
    handle.onmousedown = dragMouseDown;
  } else {
    modalElement.onmousedown = dragMouseDown;
  }

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // Get the mouse cursor position at startup
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // Call a function whenever the cursor moves
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();

    // Calculate the new cursor position offsets
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;

    // Switch layout mode to absolute positioning ONLY now that dragging has begun
    modalElement.classList.add("dragging");
    modalElement.style.transform = "none";

    // Break parent centering structures cleanly
    const overlay = document.getElementById("modal-overlay");
    overlay.style.justifyContent = "flex-start";
    overlay.style.alignItems = "flex-start";

    // Dynamically position the box directly under your mouse cursor coordinate space
    modalElement.style.top = modalElement.offsetTop - pos2 + "px";
    modalElement.style.left = modalElement.offsetLeft - pos1 + "px";
  }

  function closeDragElement() {
    // Stop moving when mouse button is released
    document.onmouseup = null;
    document.onmousemove = null;
  }
}

// Attach dragging physics to both the Bidding and Trump choosing containers
document.addEventListener("DOMContentLoaded", () => {
  makeElementDraggable(document.getElementById("bid-modal"));
  makeElementDraggable(document.getElementById("trump-modal"));
});

// --- Exit Application Logic Trigger Hook ---
function exitCurrentGameSession() {
    // Prompt confirmation checking logic window before blowing away states
    const confirmExit = confirm("Are you sure you want to exit the current match? Your current score progression will be lost.");
    
    if (confirmExit) {
        logMessage("🧹 Game session terminated by user. Resetting dashboard environments...");
        
        // Hard reset scoreboard tallies back to baseline rules bounds
        matchScoreUs = 0;
        matchScoreThem = 0;
        document.getElementById('match-score').innerText = "Us 0 - 0 Them";
        document.getElementById('round-target').innerText = "None";
        
        // Force hide open overlay panel windows completely
        document.getElementById('modal-overlay').classList.add('hidden');
        document.getElementById('bid-modal').classList.add('hidden');
        document.getElementById('trump-modal').classList.add('hidden');
        
        // Wipe card data lists and clear the center play mat surfaces
        deck = [];
        players.forEach(p => p.hand = []);
        currentTrick = [];
        
        for (let i = 0; i < 4; i++) {
            document.getElementById(`played-${i}`).innerHTML = '';
            document.getElementById(`badge-${i}`).classList.remove('active');
        }
        
        // Empty old asset layout traces on screen containers
        document.getElementById('user-hand').innerHTML = '';
        document.getElementById(`hand-1`).innerHTML = '';
        document.getElementById(`hand-2`).innerHTML = '';
        document.getElementById(`hand-3`).innerHTML = '';
        
        // Clear log timeline records safely
        document.getElementById('log-container').innerHTML = '';
        
        setTimeout(() => {
            alert("Match successfully closed. Restarting standard application context layout templates...");
            startNewRound();
        }, 500);
    }
}
