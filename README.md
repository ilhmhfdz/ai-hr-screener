#  AI HR Screener

> Eliminate bias and accelerate your recruitment pipeline with semantic AI screening.  
> Batch process up to 25 CVs instantly and uncover top talent through explainable insights.

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)


## 📌 The Problem

Traditional ATS (Applicant Tracking Systems) rely on **keyword matching** — they miss strong candidates who use different terminology, and pass weak candidates who game the system with buzzwords. HR teams still spend 8–16 hours manually reviewing resumes per hiring cycle.

**AI HR Screener** solves this by using **semantic understanding** to evaluate candidates the way a senior HR professional would — based on context, relevance, and real fit.

---

## ✨ Features

### 🧠 Semantic Résumé Parsing
Goes beyond keyword matching. The AI reads CVs contextually — understanding real experience, skill depth, and gaps even when different terminology is used.

### 📊 Multi-Dimensional Scoring
Customize scoring weights across three dimensions to match your specific role:

| Dimension | What AI Evaluates |
|---|---|
| **Technical Skills** | Skill match, depth, and relevance |
| **Experience** | Years, seniority, and industry fit |
| **Culture Fit** | Work style and values indicators |

### 🔍 Explainable AI (XAI)
No black box decisions. Every candidate score comes with concrete reasoning — strengths, missing criteria, and potential red flags — making AI decisions transparent and auditable.

### ⚡ Batch Processing
Upload and screen up to **25 CVs simultaneously** against a single job description. Results are ranked and ready within seconds.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│           FRONTEND (Vercel)             │
│         JavaScript + CSS               │
│                                         │
│  Landing → Register/Login → Dashboard  │
│  [JD Input] [CV Upload] [Results]      │
└──────────────┬──────────────────────────┘
               │ REST API
┌──────────────▼──────────────────────────┐
│            BACKEND (Render)             │
│               Python                   │
│                                         │
│  ┌───────────┐   ┌────────────────────┐ │
│  │ CV Parser │──▶│  AI Scoring Engine │ │
│  │           │   │  GPT-4o + XAI      │ │
│  └───────────┘   └────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | JavaScript, CSS |
| **Backend** | Python |
| **AI / LLM** | OpenAI GPT-4o |
| **Frontend Deploy** | Vercel |
| **Backend Deploy** | Render |

---

## 🚀 Getting Started (Local)

### Prerequisites
- Python 3.11+
- OpenAI API key

### 1. Clone Repository

```bash
git clone https://github.com/ilhmhfdz/ai-hr-screener.git
cd ai-hr-screener
```

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and fill in your API keys
```

Required `.env` variables:
```env
OPENAI_API_KEY=sk-your-openai-key-here
```

```bash
# Run backend
python main.py
```

### 3. Frontend Setup

```bash
cd frontend

# Configure environment
cp .env.example .env
```

Required `.env` variables:
```env
API_URL=http://localhost:8000
```

Open `index.html` in your browser or use a local server:
```bash
npx serve .
# or
python -m http.server 3000
```

---

## 📖 How to Use

**1. Register & Login**
Create an account at [ai-hr-screener-jet.vercel.app/register](https://ai-hr-screener-jet.vercel.app/register)

**2. Input Job Description**
Paste the job description for the position you are hiring for.

**3. Adjust Scoring Weights**
Customize the importance of each dimension based on your role priority.

**4. Upload CVs**
Upload up to 25 PDF CVs in one batch.

**5. Review Ranked Results**
View the ranked shortlist with full XAI reasoning per candidate — strengths, weaknesses, and red flags.

---

## 📁 Project Structure

```
ai-hr-screener/
├── backend/          ← Python backend (Render)
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/         ← JavaScript frontend (Vercel)
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   └── *.css
│
└── .gitignore
```

---

## 🌐 Deployment

### Frontend → Vercel
1. Connect `frontend/` to [Vercel](https://vercel.com)
2. Set environment variable `API_URL` to your Render backend URL
3. Deploy — auto-deploys on every push to `main`

### Backend → Render
1. Connect `backend/` to [Render](https://render.com)
2. Set environment variable `OPENAI_API_KEY`
3. Start command: `python main.py`

---

## 🔮 Roadmap

- [ ] Bias detection for job descriptions
- [ ] PDF shortlist report export
- [ ] Interview question generator per candidate
- [ ] Multi-language CV support (Bahasa Indonesia)
- [ ] Candidate comparison side-by-side view

---

## 👨‍💻 Author

**Ilham Hafidz**  
Junior AI Engineer · Generative AI & Machine Learning

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ilhamhafidz)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=flat&logo=github&logoColor=white)](https://github.com/ilhmhfdz)
[![Email](https://img.shields.io/badge/Email-D14836?style=flat&logo=gmail&logoColor=white)](mailto:ilhamhafidz666@gmail.com)

---

## 📄 License

MIT License — free to use and modify.

---

<div align="center">
  <i>Built to prove that AI hiring decisions should be transparent, explainable, and genuinely useful.</i>
  <br><br>
  <a href="https://ai-hr-screener-jet.vercel.app">🚀 Try it live →</a>
</div>
