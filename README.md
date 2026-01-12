
<div align="center">
<img width="1200" height="475" alt="Public Domain Clipper Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Public Domain Clipper
### Search Archives. Isolate Subjects. Build Collections.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Powered by Gemini](https://img.shields.io/badge/AI-Gemini%202.5-blue)](https://ai.google.dev/)
</div>

**Public Domain Clipper** is an open-source tool designed for digital collagists, archivists, and creators. It aggregates search results from major public domain institutions and uses Google's Gemini AI to magically "clip" subjects from their backgrounds, ready for your next project.

## ✨ Features

*   **Multi-Archive Search**: Simultaneously query:
    *   🏛️ Wikimedia Commons
    *   📜 Library of Congress
    *   🏺 The Metropolitan Museum of Art (The Met)
    *   🎨 Art Institute of Chicago
    *   📖 Internet Archive
*   **AI Subject Isolation**: Uses **Gemini 2.5 Flash** to identify and extract the main subject from vintage photos, paintings, and illustrations, replacing the background with transparency.
*   **Collection Manager**: Curate "topics" (e.g., "Vintage Bicycles", "Mushrooms") and manage your findings in a visual board.
*   **Bulk Export**: 
    *   **Subject Isolator**: Downloads a ZIP containing processed PNGs (backgrounds removed) + metadata text files.
    *   **Raw Archive**: Downloads the original high-res images with attribution data.

## 🛠️ Tech Stack

*   **Frontend**: React, Tailwind CSS, Lucide React
*   **AI**: Google GenAI SDK (`@google/genai`)
*   **Utilities**: JSZip, FileSaver.js

## 🚀 Getting Started

### Prerequisites

1.  **Node.js** (v18 or higher)
2.  **Google Gemini API Key** (Get one for free at [aistudio.google.com](https://aistudio.google.com))

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/public-domain-clipper.git
    cd public-domain-clipper
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure API Key**
    Create a `.env` file in the root directory and add your key:
    ```env
    API_KEY=your_gemini_api_key_here
    ```

4.  **Run the App**
    ```bash
    npm run dev
    ```

## 📖 How to Use

1.  **Search**: Enter a term like "Ferns" or "19th Century Machinery" in the top bar.
2.  **Curate**: The app creates a board for that topic.
3.  **Clip**: Click the ✨ (Sparkles) button on any image to use AI to remove the background.
4.  **Export**: Use the panel on the right to download your curated raw images or the AI-processed clips as a ZIP file.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

Data provided via the open APIs of Wikimedia, Library of Congress, The Met, AIC, and Internet Archive. This tool is not officially affiliated with these institutions.
