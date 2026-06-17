# BigQuery Release Notes Reader & Tweet Composer

A premium, modern dark-mode web application designed to fetch, parse, organize, and quickly Tweet about the latest Google BigQuery release notes. Built using a **Python Flask** backend and a responsive, vanilla **HTML/CSS/JavaScript** frontend.

---

## ✨ Features

* **Smart Release Splitting:** Google bundles multiple unrelated release notes into a single day's feed entry. The backend automatically splits these digests into individual, granular update cards, using the first sentence of each update as a descriptive title.
* **Integrated Tweet Composer:** Easily select any specific update to open it in a custom editor. The composer has character counting (X's 280 limit) and tags support.
* **Hashtag Pills:** Interactive pills let you toggle hashtags (`#BigQuery`, `#GCP`, `#GoogleCloud`) directly in your draft.
* **One-Click X/Twitter Intent:** Securely routes the draft text to X's Web Intent composer, bypassing the need for restricted API developer accounts.
* **Premium Dark Mode & UI:** Glassmorphism dashboard panel design, interactive slide-out drawer, custom scrollbars, loading state skeleton screens, and toast alerts.
* **Fast Search and Categorization:** Instant search bar indices and filter pills to quickly sort updates by Features, Changes, Deprecations, or Fixes.

---

## 🛠️ Technology Stack

* **Backend:** Python 3.14+ / Flask / Requests / Feedparser
* **Frontend:** Plain HTML5, Vanilla JavaScript (ES6), and Vanilla CSS3
* **Icons:** FontAwesome (v6 CDN)
* **Fonts:** Inter & JetBrains Mono (Google Fonts)

---

## 📂 Project Structure

```text
bq-releases-notes/
├── .venv/                  # Python virtual environment
├── static/
│   ├── css/
│   │   └── styles.css      # Core styles & dark theme stylesheet
│   └── js/
│       └── main.js         # Client-side routing & event handlers
├── templates/
│   └── index.html          # Main HTML structure
├── .gitignore              # Files ignored by git
├── app.py                  # Flask application & feed parsing backend
├── README.md               # Project documentation (this file)
└── requirements.txt        # Python dependency configuration
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have Python 3 installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/bkuganraj/Kugan-event-talks-app.git
   cd Kugan-event-talks-app
   ```

2. **Create and activate a virtual environment:**
   * **Windows:**
     ```powershell
     python -m venv .venv
     .venv\Scripts\activate
     ```
   * **macOS/Linux:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install the dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

### Running the App

Start the Flask server:
```bash
python app.py
```
Open your browser and navigate to: **[http://127.0.0.1:5000/](http://127.0.0.1:5000/)**

---

## 🔄 How It Works (Request/Response Cycle)

1. **Request:** The frontend JavaScript fires an asynchronous GET request to the `/api/releases` endpoint.
2. **Retrieve:** The Flask backend fetches the RSS/Atom XML feed from `docs.cloud.google.com/feeds/bigquery-release-notes.xml`.
3. **Parse & Split:** The server uses regex matching to split daily updates (under headings like `<h3>Feature</h3>`) into individual card entities. It extracts the first sentence of each update to generate clean, short titles instead of default dates.
4. **Respond:** The backend responds with a JSON array containing the list of parsed cards.
5. **Render:** The frontend renders these cards, handles searches, manages X composer templates, and opens slide-out overlays.

---

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.
