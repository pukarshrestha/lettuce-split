# 🥬 LettuceSplit

**Fair bill splitting, made simple.** Add people, toss in items, and let LettuceSplit crunch the numbers so everyone pays their fair share.

> No sign-ups. No servers. Just open and split.

---

## ✨ Features

- **Add People** — Build your group with named entries and colorful avatar chips
- **Add Bill Items** — Enter item name, unit price, and quantity
- **Assign Consumers** — Toggle who shares each item with pill-style checkboxes
- **Live Split Summary** — Instantly see each person's total and itemized breakdown
- **Card & Table Views** — Switch between a card layout or a compact table for the summary
- **Copy to Clipboard** — One-click copy of the split summary as formatted plain text with bullet points
- **Export as PDF** — Generate a clean, tabular PDF report with bill items and split breakdown
- **Multi-Currency** — Supports NPR, USD, GBP, INR, and BDT
- **Dark Mode** — Toggle between light and dark themes, with system preference detection
- **Inline Editing** — Edit item names, prices, and quantities directly in the table
- **Persistent Preferences** — Theme, currency, and view mode are saved to local storage

---

## 🛠 Tech Stack

| Layer       | Technology                      |
| ----------- | ------------------------------- |
| Structure   | HTML5 (semantic, accessible)    |
| Styling     | Vanilla CSS (custom properties) |
| Logic       | Vanilla JavaScript (ES6+)      |
| Typography  | [Figtree](https://fonts.google.com/specimen/Figtree) via Google Fonts |
| PDF Export  | [jsPDF](https://github.com/parallax/jsPDF) + [autoTable](https://github.com/simonbengtsson/jsPDF-AutoTable) |

**Zero build tools. Zero dependencies. Just open `index.html`.**

---

## 🚀 Getting Started

### Option 1 — Open Directly

```bash
# Clone the repo
git clone https://github.com/pukarshrestha/lettuce-split.git

# Open in your browser
open lettuce-split/index.html
```

### Option 2 — Serve Locally

```bash
# Using Python
python3 -m http.server 8000 -d lettuce-split

# Using Node (npx)
npx serve lettuce-split
```

Then visit `http://localhost:8000`

---

## 📋 Clipboard Format

When you click the copy button, the summary is formatted as:

```
Split Summary
──────────────────────────────────

Alice — Rs. 455.00
  • Margherita Pizza: Rs. 225.00
  • Caesar Salad: Rs. 140.00
  • Iced Latte: Rs. 90.00

Bob — Rs. 455.00
  • Margherita Pizza: Rs. 225.00
  • Caesar Salad: Rs. 140.00
  • Iced Latte: Rs. 90.00

──────────────────────────────────
Total: Rs. 910.00
```

---

## 📁 Project Structure

```
lettuce-split/
├── index.html   → App markup & structure
├── index.css    → Design system & all styles
├── app.js       → State management, rendering & interactions
└── README.md
```

---

## 🎨 Design

- Built on the **Untitled UI** design pattern with a **Lime (#A8FF70)** brand accent
- Supports **light** and **dark** themes via CSS custom properties
- Smooth micro-animations on cards, chips, and interactive elements
- Fully responsive layout

---

## 📄 License

MIT — feel free to use, modify, and share.
