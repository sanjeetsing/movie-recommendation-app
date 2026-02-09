# 🎬 Movie Recommendation App

A full-stack web application that suggests movies based on user preferences such as genre, mood, or similar films.

This project demonstrates practical skills in **frontend development, backend APIs, database integration, API handling, deployment, and error handling** in a real-world scenario.

---

## 🌐 Live Demo

Frontend (Vercel):
[https://movie-recommendation-app-flax-six.vercel.app/](https://movie-recommendation-app-flax-six.vercel.app/)

Backend API (Render):
[https://movie-recommendation-app-b25c.onrender.com/](https://movie-recommendation-app-b25c.onrender.com/)

Health Check:
[https://movie-recommendation-app-b25c.onrender.com/health](https://movie-recommendation-app-b25c.onrender.com/health)

---

## ✨ Features

• Takes user input (genre, mood, similar movies, etc.)
• Returns **3–5 movie recommendations**
• Saves recommendations in **SQLite database**
• Displays history of past recommendations
• Handles API errors gracefully using fallback logic
• Fully deployed frontend and backend

---

## 🛠️ Tech Stack

### Frontend

* React (Vite)
* CSS

### Backend

* Node.js
* Fastify

### Database

* SQLite

### APIs

* Google Gemini API
* Fallback recommendation logic

### Deployment

* Vercel (Frontend)
* Render (Backend)

---

## 📌 How the System Works

1. User enters a movie preference.
2. Frontend sends a request to backend API.
3. Backend:

   * Calls Gemini API for recommendations
   * If API fails → fallback recommendations used
4. Recommendations stored in SQLite.
5. Results displayed on UI.

---

## 🧠 Why I Built This

I wanted to build a small but complete full-stack project that covers:

• API integration
• Frontend-backend communication
• Database storage
• Deployment to cloud
• Real-world error handling

This project helped me understand how production-style applications are built and deployed.

---

## 🚀 How to Run Locally

### 1. Clone Repository

```bash
git clone https://github.com/sanjeetsing/movie-recommendation-app.git
cd movie-recommendation-app
```

---

### 2. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Backend runs at:

```
http://localhost:3001
```

---

### 3. Frontend Setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at:

```
http://localhost:5173
```

---

## 🗄️ Database

SQLite is used to store:

• User input
• Recommended movies
• Timestamp

Check saved data:

```
http://localhost:3001/history
```

---

## ⚠️ Error Handling

If Gemini API:

* quota exceeded
* invalid key
* network error

The app automatically:

* returns fallback recommendations
* stores results in database
* keeps UI working

This ensures reliability and good user experience.

---

## 📷 Screenshots

Add screenshots in this folder:

```
screenshots/home.png
screenshots/recommendation.png
```

---

## 🔮 Future Improvements

• Movie posters and ratings
• User login system
• Better recommendation algorithm
• Caching recommendations
• Cloud database

---

## 👨‍💻 Author

Sanjeet Singh
Full-Stack Developer | Python | React | APIs

Email: [sanjeetsinghsolanki11@gmail.com]


