# ♟️ RONGOON'S CHESS BATTLE ENGINE & HOME OVERHAUL
## *Play Full 8×8 Neo-GBA Chess Against Rongoon's Multi-Level AI Engine*

---

> **Overview:** Step inside **Rongoons Home** (`x: 30, y: 15` in WolfsCity) to challenge **Rongoon** to a complete game of chess. Sit at the chess table, choose your AI difficulty (**Beginner**, **Easy**, **Tuff**, or **Extreme**), and battle on a large, fullscreen 64-square pixel-art board.

---

## 1. 🏠 Inside Rongoon's Home (`Rongoons Home`)
- **Location:** WolfsCity (`x: 30, y: 15`) beside the city gardens.
- **Interior Layout:**
  - **Rongoon NPC (`x: 10, y: 5`)**: Seated on a chair at the north side of the chess table waiting for a challenger.
  - **Chess Board Table (`x: 10, y: 6`)**: Features a rich wooden table (`#8a5a36`) topped with an unmistakable 8-bit checkerboard pattern and miniature chess pieces (`♔ ♞ ♟ ♕`) sitting on top of the squares.
  - **Player Chair (`x: 10, y: 7`)**: When you walk onto this chair, your character automatically sits down opposite Rongoon (`.player-seated`).

---

## 2. 🎚️ Level Selection & Dialogue (`#chess-level-modal`)
- **Speaking with Rongoon Directly:** If you talk to Rongoon (`x: 10, y: 5`), he gives his welcoming conversational dialogue:
  > *"Welcome to my home, traveler! I am Rongoon, the Chess Genius of Cronos Town. Take a seat across from me and interact with the chess board on the table when you are ready to challenge my undefeated engine!"*
- **Interacting with the Chess Board on the Table:** The level selector is **activated only when you interact with the chess board on the table (`x: 10, y: 6`)**—either by pressing `A` / `Enter` / `Space` while sitting opposite him (`x: 10, y: 7`) or standing adjacent, or by clicking the table directly with your mouse.
- Upon table interaction, Rongoon gives his introduction:
  > *"Welcome to my board, challenger! I am Rongoon, the undefeated Chess Genius of Cronos Town! My tactical engine sees 10 moves ahead, and NO ONE has ever beaten me on the 64 squares! Dare you challenge my mind? At what level are you at?"*
- You can choose from 4 distinct AI difficulty levels:
  1. **`Beginner (Casual Engine)`**: Makes simple, casual legal moves.
  2. **`Easy (Capture AI)`**: Actively looks for and captures unprotected white pieces.
  3. **`Tuff (2-Ply Minimax)`**: Evaluates material balance and center square control.
  4. **`Extreme (Grandmaster Rongoon!)`**: Deep minimax evaluation with positional piece-square bonuses, king safety evaluation, and blunder punishment.

---

## 3. 🖥️ The Large Fullscreen Chess Battle UI (`#chess-battle-ui`)
Once a level is chosen, the game screen transitions to the massive **Rongoon Chess Battle** interface:
- **Top Header (Rongoon's Side):**
  - Displays Rongoon's crown avatar (`👑`), current AI difficulty level, and captured White pieces (`♙ ♘ ♗ ...`).
- **Center Board (8×8 Grid):**
  - Large interactive pixel-art chess squares (`#e7e6bd` light squares / `#687452` dark squares) with crisp Unicode chess piece symbols (`♔ ♕ ♖ ♗ ♘ ♙` and `♚ ♛ ♜ ♝ ♞ ♟`).
  - Selecting a White piece highlights the square in gold (`#f4c867`) and marks all legal destination squares with a glowing cyan border (`#83d1c7`).
- **Side Commentary & Move History Panel:**
  - Displays Rongoon's real-time trash talk and commentary (*"My Extreme engine sees every tactical line on the board!"*).
  - Standard algebraic move notation history (`1. e4 e5   2. Nf3 Nc6 ...`).
- **Bottom Header (Player's Side):**
  - Displays your player avatar (`👤`), nameplate (`WHITE PIECES`), captured Black pieces (`♟ ♞ ♝ ...`), and quick buttons for `🏳️ RESIGN / EXIT` and `🔄 NEW BATTLE`.

---

## 4. 🏆 Rewards for Beating Rongoon
If you defeat Rongoon by Checkmate while playing as White:
- Rongoon exclaims:
  > *"INCREDIBLE! You checkmated my chess engine! You are a Grandmaster of Cronos Town!"*
- You instantly earn **`+500 CroVegas Demo Chips`** and **`+300 Flipsuite XP`**, and the status banner updates to **`CHECKMATE! WHITE (PLAYER) WINS! 🏆`**.

*Built for the Cronos Town 2026 Cyber-Native RPG Experience.* 🐺♟️