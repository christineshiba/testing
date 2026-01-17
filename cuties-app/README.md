# Cuties App 💕

A modern social connection platform for making IRL connections and finding others within your community.

## Features

- **Landing Page**: Beautiful hero section with features and how-it-works sections
- **User Authentication**: Login and signup pages with mock authentication
- **Discovery Interface**: Tinder-style card swiping to discover new people
- **Matches**: View all your matches in a clean grid layout
- **Messaging**: Real-time chat interface with matched users
- **Profile**: Personal profile page with settings

## Tech Stack

- **React** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Context API** - State management

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   └── Layout/
│       ├── Header.jsx
│       └── Header.css
├── pages/
│   ├── LandingPage.jsx
│   ├── LoginPage.jsx
│   ├── SignupPage.jsx
│   ├── DiscoverPage.jsx
│   ├── MatchesPage.jsx
│   ├── ChatPage.jsx
│   └── ProfilePage.jsx
├── context/
│   └── AppContext.jsx
├── App.jsx
├── main.jsx
└── index.css
```

## Features Breakdown

### Authentication
Mock authentication system that allows users to login or signup. Currently uses frontend-only authentication.

### Discovery
- Swipe-style interface for discovering new users
- View user profiles with photos, bio, and interests
- Like or pass on profiles
- Automatic matching when both users like each other

### Matches & Chat
- Grid view of all matched users
- Real-time messaging interface
- Auto-responses for demo purposes

### Profile
- User profile display
- Settings for discovery preferences
- Editable profile information

## Future Enhancements

- Backend API integration
- Real authentication and authorization
- Database for users and messages
- Real-time messaging with WebSockets
- Photo upload functionality
- Location-based matching
- Push notifications
- Mobile app version

## License

MIT
