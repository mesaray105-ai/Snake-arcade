# Snake Arcade

A browser-based Snake game with touch controls, offline play after the first visit, and a leaderboard.

## Run locally

```sh
npm start
```

Open `http://localhost:3000`.

## Publish a public URL

The included `render.yaml` configures a free Render web service. To publish:

1. Create a GitHub repository and upload this project. Do not upload `scores.json`; it is local game data and is excluded by `.gitignore`.
2. In Render, choose **New → Blueprint**, connect that repository, and apply the `render.yaml` configuration.
3. When the service is live, open its `*.onrender.com` address from any phone or computer and share that URL.

Render's free service may sleep when idle, so the first visit after a quiet period can take a little longer. Its filesystem is temporary, so leaderboard scores can reset when the service restarts or redeploys.

## Install on a phone

Visit the published URL in the phone's browser. On Android, choose **Install app** or **Add to Home screen** from the browser menu. On iPhone, use **Share → Add to Home Screen** in Safari. The game can be played offline after it has loaded once; saving or loading leaderboard scores requires an internet connection.

On phones, tap **Play**; on desktop, press **Play** on the game board. Either opens a full-screen play area that prevents the page from moving while you play. Choose **Menu** to return to the page. Open **Settings** to choose Easy, Normal, or Hard, adjust swipe sensitivity, and set the username used for your scores. These preferences are saved in that browser on that device.
