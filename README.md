# Partela Server

Backend for the Partela restaurant payment prototype.

## Tech Stack
- Node.js + Express
- Socket.IO for real-time communication
- TypeScript
- In-memory data storage (demo)

## Getting Started

### Install Dependencies
```bash
npm install
```

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Environment Variables

Copy `.env.example` to `.env` and adjust as needed:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Environment mode |
| `CORS_ORIGINS` | http://localhost:4200 | Allowed CORS origins (comma-separated) |
| `MAX_GUESTS_PER_TABLE` | 4 | Maximum guests per table |
| `DEFAULT_TAX_RATE` | 0.08 | Default tax rate (8%) |
| `DEFAULT_SERVICE_FEE_RATE` | 0.02 | Default service fee rate (2%) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api` | API info and WebSocket events |
| POST | `/api/tables` | Create a new table (demo) |

## WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `table:join` | `{ tableId: string }` | Join a table |
| `table:leave` | - | Leave current table |
| `vote:cast` | `{ mode: PaymentMode }` | Cast a vote for payment mode |
| `split:toggle_item` | `{ itemId: string }` | Toggle item selection (custom split) |
| `split:confirm` | - | Confirm item selection |
| `payment:submit` | `PaymentInfo` | Submit payment |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `table:state` | `TableDTO` | Full table state |
| `table:guest_joined` | `{ guest, guestCount }` | Guest joined |
| `table:guest_left` | `{ guestId, displayName, guestCount }` | Guest left |
| `vote:updated` | `{ votes, totalVotes, totalGuests }` | Voting update |
| `vote:completed` | `{ winningMode, message }` | Voting complete |
| `split:updated` | `{ itemAssignments, remainingBalance, allAssigned }` | Split update |
| `split:validated` | `{ valid, issues }` | Split validation result |
| `payment:received` | `{ guestId, displayName }` | Payment received |
| `table:completed` | - | All payments complete |
| `error` | `{ code, message }` | Error message |
