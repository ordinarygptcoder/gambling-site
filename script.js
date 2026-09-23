/* ==========================================================================
   THE BRASS TABLE — a simple single-player blackjack game vs. a dealer bot.

   This file is written to be readable for a beginner. It's organised into
   five parts:
     1. Game state       — the variables that describe "what's happening now"
     2. Deck helpers      — building/shuffling a deck, card values
     3. Rendering         — turning state into what's shown on screen
     4. Game actions       — deal, hit, stand, double down, payout
     5. Event wiring       — connecting buttons/chips to the actions above
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* 1. GAME STATE                                                           */
/* ---------------------------------------------------------------------- */

const STARTING_CASH = 10000000; // 10,000,000đ
const MIN_BET = 10000;          // 10.000đ
const MAX_BET = 1000000;        // 1.000.000đ

// Format a number the Vietnamese way: "." as the thousands separator,
// with a trailing đ — e.g. formatVnd(1000000) -> "1.000.000đ".
function formatVnd(amount) {
  return Wallet.formatVnd(amount);
}

let state = {
  cash: STARTING_CASH,
  bet: 0,
  deck: [],
  playerHand: [],
  dealerHand: [],
  // "betting"      -> waiting for a bet + Deal
  // "player-turn"  -> player can Hit / Stand / Double
  // "dealer-turn"  -> dealer bot is playing itself out
  // "round-over"   -> round finished, waiting for next Deal
  phase: "betting",
};

/* ---------------------------------------------------------------------- */
/* 2. DECK HELPERS                                                        */
/* ---------------------------------------------------------------------- */

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

// Build a fresh, shuffled 52-card deck.
// Each card is a small object like { rank: "K", suit: "♥" }.
function createShuffledDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  // Fisher-Yates shuffle: walk backwards, swap each card with a random
  // earlier one. This gives a fair, unbiased shuffle.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// Draw the top card from the deck. If the deck runs low, reshuffle a new one
// first (a real casino "shoe" gets replaced before it runs out).
function drawCard() {
  if (state.deck.length === 0) {
    state.deck = createShuffledDeck();
  }
  return state.deck.pop();
}

// Blackjack point value of a single card (face cards = 10, Ace = 11 for now).
function cardValue(card) {
  if (card.rank === "A") return 11;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

// Total value of a hand, automatically counting Aces as 1 instead of 11
// whenever counting them as 11 would bust the hand over 21.
function handTotal(hand) {
  let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
  let aceCount = hand.filter((card) => card.rank === "A").length;
  while (total > 21 && aceCount > 0) {
    total -= 10; // treat one Ace as 1 instead of 11
    aceCount -= 1;
  }
  return total;
}

function isBlackjack(hand) {
  return hand.length === 2 && handTotal(hand) === 21;
}

/* ---------------------------------------------------------------------- */
/* 3. RENDERING — draw the current state to the page                      */
/* ---------------------------------------------------------------------- */

const el = {
  dealerCards: document.getElementById("dealer-cards"),
  playerCards: document.getElementById("player-cards"),
  dealerTotal: document.getElementById("dealer-total"),
  playerTotal: document.getElementById("player-total"),
  message: document.getElementById("message"),
  shoeCount: document.getElementById("shoe-count"),
  cashValue: document.getElementById("cash-value"),
  betValue: document.getElementById("bet-value"),
  dealBtn: document.getElementById("deal-btn"),
  hitBtn: document.getElementById("hit-btn"),
  standBtn: document.getElementById("stand-btn"),
  doubleBtn: document.getElementById("double-btn"),
  chips: Array.from(document.querySelectorAll(".chip")),
  clearBetBtn: document.getElementById("clear-bet"),
  resetOverlay: document.getElementById("reset-overlay"),
  resetBtn: document.getElementById("reset-btn"),
  music: document.getElementById("bg-music"),
  musicToggle: document.getElementById("music-toggle"),
};

// Build the little DOM element for one playing card.
// hideRank=true renders a face-down card back (used for the dealer's hole card).
function renderCard(card, hideRank) {
  const div = document.createElement("div");

  if (hideRank) {
    div.className = "card back";
    return div;
  }

  const isRed = card.suit === "♥" || card.suit === "♦";
  div.className = "card" + (isRed ? " red" : "");
  div.innerHTML = `
    <div class="corner">${card.rank}${card.suit}</div>
    <div class="pip">${card.suit}</div>
    <div class="corner" style="align-self:flex-end;">${card.rank}${card.suit}</div>
  `;
  return div;
}

// Redraw everything based on the current `state`. Called after every action.
function render() {
  // Cards
  el.playerCards.innerHTML = "";
  state.playerHand.forEach((card) => el.playerCards.appendChild(renderCard(card, false)));

  el.dealerCards.innerHTML = "";
  state.dealerHand.forEach((card, i) => {
    // Hide the dealer's second card while it's still the player's turn.
    const shouldHide = i === 1 && state.phase === "player-turn";
    el.dealerCards.appendChild(renderCard(card, shouldHide));
  });

  // Totals — the dealer's total is hidden until their hole card is revealed.
  el.playerTotal.textContent = state.playerHand.length ? handTotal(state.playerHand) : "—";
  if (state.dealerHand.length === 0) {
    el.dealerTotal.textContent = "—";
  } else if (state.phase === "player-turn") {
    el.dealerTotal.textContent = cardValue(state.dealerHand[0]); // only the up-card shows
  } else {
    el.dealerTotal.textContent = handTotal(state.dealerHand);
  }

  // Money
  el.cashValue.textContent = formatVnd(state.cash);
  Wallet.setBalance(state.cash); // keep the shared site-wide wallet in sync
  el.betValue.textContent = formatVnd(state.bet);
  el.shoeCount.textContent = `${state.deck.length} cards left in the shoe`;

  // Buttons: only the moves that are actually legal right now are enabled.
  const inPlayerTurn = state.phase === "player-turn";
  el.hitBtn.disabled = !inPlayerTurn;
  el.standBtn.disabled = !inPlayerTurn;
  el.doubleBtn.disabled = !(
    inPlayerTurn &&
    state.playerHand.length === 2 &&
    state.cash >= state.bet
  );
  el.dealBtn.disabled = !(
    state.phase === "betting" &&
    state.bet >= MIN_BET &&
    state.bet <= MAX_BET
  );

  // Chips can only be adjusted while betting, and never past the table's max bet.
  el.chips.forEach((chip) => {
    const value = parseInt(chip.dataset.value, 10);
    chip.disabled =
      state.phase !== "betting" || value > state.cash || state.bet + value > MAX_BET;
  });
  el.clearBetBtn.disabled = state.phase !== "betting" || state.bet === 0;

  // Dead broke? Show the buy-back-in screen.
  el.resetOverlay.classList.toggle("visible", state.cash === 0 && state.bet === 0 && state.phase === "betting");
}

function setMessage(text, kind) {
  el.message.textContent = text;
  el.message.className = "message" + (kind ? " " + kind : "");
}

/* ---------------------------------------------------------------------- */
/* 4. GAME ACTIONS                                                        */
/* ---------------------------------------------------------------------- */

function addToBet(amount) {
  if (state.phase !== "betting") return;
  if (amount > state.cash) return; // can't bet more than you have
  if (state.bet + amount > MAX_BET) {
    setMessage(`Table limit is ${formatVnd(MAX_BET)} per bet.`);
    render();
    return;
  }
  state.cash -= amount;
  state.bet += amount;
  if (state.bet < MIN_BET) {
    setMessage(`Bet is ${formatVnd(state.bet)}. Minimum bet is ${formatVnd(MIN_BET)}.`);
  } else {
    setMessage(`Bet is ${formatVnd(state.bet)}. Deal when you're ready.`);
  }
  render();
}

function clearBet() {
  if (state.phase !== "betting") return;
  state.cash += state.bet;
  state.bet = 0;
  setMessage(`Place a bet (${formatVnd(MIN_BET)}–${formatVnd(MAX_BET)}) to begin.`);
  render();
}

function startRound() {
  if (state.phase !== "betting" || state.bet < MIN_BET || state.bet > MAX_BET) return;

  // Fresh 52-card deck every round, shuffled from scratch — no card-counting
  // across rounds, and every deal starts from a full shoe.
  state.deck = createShuffledDeck();

  state.playerHand = [drawCard(), drawCard()];
  state.dealerHand = [drawCard(), drawCard()];
  state.phase = "player-turn";
  setMessage("Your move: hit, stand, or double down.");
  render();

  // Natural blackjacks are settled immediately, before any hitting happens.
  const playerBJ = isBlackjack(state.playerHand);
  const dealerBJ = isBlackjack(state.dealerHand);
  if (playerBJ || dealerBJ) {
    finishRound();
  }
}

function playerHit() {
  if (state.phase !== "player-turn") return;
  state.playerHand.push(drawCard());

  if (handTotal(state.playerHand) > 21) {
    setMessage("Bust! That hand goes over 21.", "lose");
    state.phase = "round-over";
    settleBets("dealer");
  } else {
    setMessage("Hit again, or stand.");
  }
  render();
}

function playerStand() {
  if (state.phase !== "player-turn") return;
  state.phase = "dealer-turn";
  render();
  // Small delay so the dealer's cards feel like they're being "played",
  // rather than the whole hand resolving instantly.
  setTimeout(dealerPlay, 500);
}

function playerDouble() {
  if (state.phase !== "player-turn") return;
  if (state.playerHand.length !== 2 || state.cash < state.bet) return;

  state.cash -= state.bet;
  state.bet *= 2;
  state.playerHand.push(drawCard());
  render();

  if (handTotal(state.playerHand) > 21) {
    setMessage("Bust on the double! Tough beat.", "lose");
    state.phase = "round-over";
    settleBets("dealer");
    render();
  } else {
    setMessage("Doubled down. Standing automatically.");
    state.phase = "dealer-turn";
    render();
    setTimeout(dealerPlay, 500);
  }
}

// Dealer bot logic: reveal hole card, then hit on 16 or below, stand on 17+.
// This is the standard casino house rule (dealer stands on all 17s).
function dealerPlay() {
  if (handTotal(state.dealerHand) < 17) {
    state.dealerHand.push(drawCard());
    render();
    setTimeout(dealerPlay, 500); // keep drawing, one card at a time
  } else {
    finishRound();
  }
}

// Compare final hands and settle the bet. Called once the dealer is done
// (or immediately after a natural blackjack / player bust).
function finishRound() {
  state.phase = "round-over";

  const playerTotal = handTotal(state.playerHand);
  const dealerTotal = handTotal(state.dealerHand);
  const playerBJ = isBlackjack(state.playerHand);
  const dealerBJ = isBlackjack(state.dealerHand);

  if (playerTotal > 21) {
    settleBets("dealer"); // already messaged in playerHit(), but safe to repeat
  } else if (playerBJ && dealerBJ) {
    setMessage("Both have blackjack — push. Bet returned.", "push");
    settleBets("push");
  } else if (playerBJ) {
    setMessage("Blackjack! Pays 3 to 2.", "win");
    settleBets("player-blackjack");
    if (typeof Achievements !== "undefined") Achievements.unlock("blackjack");
  } else if (dealerBJ) {
    setMessage("Dealer has blackjack.", "lose");
    settleBets("dealer");
  } else if (dealerTotal > 21) {
    setMessage("Dealer busts — you win!", "win");
    settleBets("player");
  } else if (playerTotal > dealerTotal) {
    setMessage(`You win, ${playerTotal} to ${dealerTotal}.`, "win");
    settleBets("player");
  } else if (playerTotal < dealerTotal) {
    setMessage(`Dealer wins, ${dealerTotal} to ${playerTotal}.`, "lose");
    settleBets("dealer");
  } else {
    setMessage(`Push at ${playerTotal}. Bet returned.`, "push");
    settleBets("push");
  }

  render();
}

// Pay out (or take) the bet, then reset for the next round.
// outcome: "player" | "player-blackjack" | "dealer" | "push"
function settleBets(outcome) {
  if (outcome === "player") {
    state.cash += state.bet * 2; // original bet back, plus an equal win
  } else if (outcome === "player-blackjack") {
    state.cash += state.bet + Wallet.roundReward(state.bet * 1.5); // 3:2 payout, rounded up
  } else if (outcome === "push") {
    state.cash += state.bet; // just get the bet back
  }
  // "dealer" outcome: the bet is simply gone — nothing to add back.

  state.bet = 0;
  state.phase = "betting";
  // Hands stay visible until the next Deal is pressed, so the player can
  // see the final board. They're cleared in startRound().
}

function buyBackIn() {
  state.cash = STARTING_CASH;
  setMessage(`Fresh ${formatVnd(STARTING_CASH)}. Good luck this time.`);
  render();
}

/* ---------------------------------------------------------------------- */
/* 5. EVENT WIRING                                                        */
/* ---------------------------------------------------------------------- */

el.chips.forEach((chip) => {
  chip.addEventListener("click", () => addToBet(parseInt(chip.dataset.value, 10)));
});

el.clearBetBtn.addEventListener("click", clearBet);
el.dealBtn.addEventListener("click", startRound);
el.hitBtn.addEventListener("click", playerHit);
el.standBtn.addEventListener("click", playerStand);
el.doubleBtn.addEventListener("click", playerDouble);
el.resetBtn.addEventListener("click", buyBackIn);

/* ---------------------------------------------------------------------- */
/* BACKGROUND MUSIC                                                       */
/* ---------------------------------------------------------------------- */
// Browsers block audio-with-sound from playing until the visitor has
// interacted with the page at least once. So we: (1) try to autoplay
// immediately, and (2) if that's blocked, start it on the very first click
// anywhere on the page. Either way, the toggle button lets them mute it.

let musicWantedOn = true; // the player's intent — separate from whether it's actually playing

function updateMusicButton() {
  el.musicToggle.textContent = musicWantedOn ? "\u266B Music: On" : "\u266B Music: Off";
  el.musicToggle.classList.toggle("playing", musicWantedOn && !el.music.paused);
  el.musicToggle.classList.toggle("muted", !musicWantedOn);
}

function tryPlayMusic() {
  if (!musicWantedOn) return;
  el.music.volume = 0.35; // background music should sit behind the game, not over it
  el.music.play().catch(() => {
    // Autoplay was blocked — that's fine, it'll start on the first click below.
  }).finally(updateMusicButton);
}

el.musicToggle.addEventListener("click", () => {
  musicWantedOn = !musicWantedOn;
  if (musicWantedOn) {
    tryPlayMusic();
  } else {
    el.music.pause();
    updateMusicButton();
  }
});

// Fallback: start music on the first interaction anywhere, if it hasn't
// started yet and the player hasn't explicitly turned it off.
document.addEventListener(
  "click",
  () => {
    if (musicWantedOn && el.music.paused) tryPlayMusic();
  },
  { once: true }
);

tryPlayMusic();
updateMusicButton();

// First paint. Pick up the shared wallet balance instead of always
// starting fresh, so winnings/losses from the other games carry over.
state.cash = Wallet.getBalance();
el.resetBtn.textContent = `Buy back in — ${formatVnd(STARTING_CASH)}`;
state.deck = createShuffledDeck();
render();
