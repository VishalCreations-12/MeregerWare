# V Task Force

Meteor 3 + **Blaze** task workspace designed to **run without any database server**. All task and category data lives in the browser: **MiniMongo (in-memory)** with **`localStorage` snapshots** so a zip/Git clone survives refresh and reinstall on the same machine. The UI still behaves like a small SaaS shell (sidebar, dashboard, filters, drag-and-drop).

## How data works

| Layer | Role |
|--------|------|
| **MiniMongo** (`Mongo.Collection` with `connection: null`) | In-memory reactive store while the tab is open |
| **`localStorage` key `vtf-local-db`** | Serialized tasks + categories (ISO dates), reapplied on startup |
| **`localStorage` keys `vtf-session`, `vtf-users`** | Lightweight demo login (email + password stored **in plain text** — demo only) |

There are **no Meteor methods**, **no publications**, and **no `accounts-password`** dependency. The Node server only boots an empty shell so `meteor run` works like a normal Meteor app.

## Features

- Local email/password sign-up and sign-in (browser-only, not suitable for production secrets)
- Tasks CRUD, filters, search, dashboard metrics, SortableJS reorder (writes `sortOrder` locally)
- Default categories plus custom categories
- Dark/light theme (`vtf-theme` in `localStorage`)

## Requirements

- [Meteor 3.x](https://www.meteor.com/install)

No MongoDB Atlas or `MONGO_URL` is required for app logic. Meteor may still start its dev Mongo process depending on your toolchain; this project **does not read/write** application data there.

## Installation (zip / GitHub clone)

```bash
cd M-V
meteor npm install
meteor
```

Open `http://localhost:3000`.

## Deployment

Build static/hostable bundle the usual Meteor way:

```bash
meteor build ../dist --architecture os.linux.x86_64
```

Deploy the resulting Node bundle anywhere that can run Meteor’s server bundle. Remember: **data stays in each visitor’s browser**, not on your server.

## Security warning

This mode stores passwords **without hashing** in `localStorage` and is meant for **offline demos, classrooms, and sharing a runnable repo**. Do **not** reuse real passwords.

## Folder structure

```
├── client/main.js
├── server/main.js                    # Minimal Meteor startup (no data layer)
├── imports/
│   ├── api/
│   │   ├── collections.local.js      # Client-only collections (connection: null)
│   │   ├── localAuth.js              # Session + user map in localStorage
│   │   ├── localPersistence.js       # Hydrate / persist MiniMongo ↔ localStorage
│   │   └── localActions.js           # Task/category mutations (client-side)
│   ├── lib/constants.js
│   ├── startup/client/
│   └── ui/
└── package.json
```

## Screenshots

Add screenshots of dashboard (light/dark) and mobile sidebar after capture.

## License

Specify your license before public release.
