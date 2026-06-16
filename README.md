# BigQuery Release Radar 📡

A modern, responsive, and dark-themed web application to ingest, track, search, filter, and share Google BigQuery release notes in real-time. Built using a lightweight **Python Flask** backend and a **Vanilla HTML5/JS/CSS** frontend.

👉 **GitHub Repository**: [sbalguri/antigravity-event-talks-app](https://github.com/sbalguri/antigravity-event-talks-app)

---

## 🌟 Key Features

* **Live RSS/Atom Feed Ingestion**: Connects directly to Google's official feed to download and parse BigQuery release notes XML.
* **Granular Itemization**: Automatically splits daily composite entries into separate release cards categorized by tags (Features, Issues, Announcements, Changes, and Breaking Changes).
* **Live Dashboard Statistics**: Tracks metrics on loaded entries, counting the total number of days, features, issues, and announcements in real-time.
* **Search & Filters**:
  * Filter cards instantly by category chip (All, Features, Issues, Announcements, Changes & Breaking).
  * Search keywords dynamically across all loaded description logs.
* **X (Twitter) Composer Modal**: Edit your share posts directly inside the app before publishing.
* **Live Twitter/X Preview Card**:
  * Mimics the layout of a dark-themed post on X.
  * Real-time character counter (blocks sharing if text exceeds 280 characters).
  * Auto-highlights `#hashtags` and `http://links` in Twitter Blue.
* **Bulk Sharing & Clipboard Utilities**: Select multiple cards to compose a aggregated bulk tweet or copy formatted texts directly to the clipboard with visual check animations.

---

## ⚙️ Architecture

```
                                  [ Google Cloud Feed ]
                                            │
                                            ▼ (Atom XML)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Flask Backend (app.py)                                                      │
│  ├── GET /                    -> Serves templates/index.html                │
│  └── GET /api/release-notes   -> Downloads feed, parses XML, splits by <h3> │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼ (JSON REST Endpoint)
┌─────────────────────────────────────────────────────────────────────────────┐
│ Vanilla Frontend (static/)                                                  │
│  ├── templates/index.html     -> Main HTML Document                          │
│  ├── static/css/style.css     -> Dark theme styles & Mock X card CSS        │
│  └── static/js/app.js         -> Event listeners, filtering & Tweet Composer│
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.8 or higher installed on your local machine.

### Installation & Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/sbalguri/antigravity-event-talks-app.git
   cd calendar-event-talks-app
   ```

2. **Set up a Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install Dependencies**:
   ```bash
   pip install Flask requests
   ```

4. **Run the Flask Development Server**:
   ```bash
   python app.py
   ```
   *Note: The app runs on port `5001` to prevent conflicts with macOS AirPlay systems, which run on port `5000` by default.*

5. **Open the Application**:
   Navigate to [http://127.0.0.1:5001](http://127.0.0.1:5001) in your browser.

---

## 📂 File Structure

```
.
├── app.py                  # Flask Application Server & Feed Parser
├── templates/
│   └── index.html          # HTML Interface Markup
├── static/
│   ├── css/
│   │   └── style.css       # Visual styling (dark mode, timeline, X card)
│   └── js/
│       └── app.js          # Core Client logic (filtering, composer, clipboard)
├── .gitignore              # Ignored local venv / python caches
└── README.md               # Documentation
```

---

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
