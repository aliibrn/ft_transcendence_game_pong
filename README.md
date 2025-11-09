# Pong Game Architecture Documentation

## Overview
This is a complete multiplayer Pong game server supporting three game modes: **Local**, **Remote**, and **Solo (AI)**.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  PongClient (WebSocket)                              │  │
│  │  - Handles connection                                │  │
│  │  - Sends mode selection & input                      │  │
│  │  - Receives game state updates                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                         SERVER                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  GameController                                     │   │
│  │  - Manages connections                              │   │
│  │  - Creates WebSocketHandler for each client        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  WebSocketHandler (per connection)                  │   │
│  │  - Handles messages                                 │   │
│  │  - Routes to appropriate service/game               │   │
│  └─────────────────────────────────────────────────────┘   │
│              │                        │                     │
│              │                        │                     │
│    ┌─────────▼───────────┐  ┌────────▼──────────┐          │
│    │ MatchmakingService  │  │   PongGame         │          │
│    │ (Remote mode only)  │  │   (Local/Solo)     │          │
│    │  - Queue management │  │   - Game logic     │          │
│    │  - Creates games    │  │   - Physics        │          │
│    │  - Pairs players    │  │   - AI (solo)      │          │
│    └─────────────────────┘  └────────────────────┘          │
│              │                                               │
│    ┌─────────▼───────────────────────────────────┐          │
│    │  PongGame (Remote mode)                     │          │
│    │  - Manages 2 players                        │          │
│    │  - Broadcasts to both sockets               │          │
│    └─────────────────────────────────────────────┘          │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Models                                             │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐             │   │
│  │  │ Player  │  │  Ball   │  │PongGame │             │   │
│  │  └─────────┘  └─────────┘  └─────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Game Modes

### 1. Local Mode
**Flow:**
1. Client connects and selects "local" mode
2. Server creates a PongGame instance
3. Single WebSocket connection controls both paddles
4. Client sends input for player1 (W/S) and player2 (Arrow keys)
5. Server broadcasts updates to the same client

**Key Points:**
- One socket, one game instance
- Both players share same keyboard
- No matchmaking needed
- Immediate game creation

### 2. Remote Mode
**Flow:**
1. Client A connects and selects "remote" mode
2. Server adds Client A to matchmaking queue
3. Client B connects and selects "remote" mode
4. Server matches Client A and Client B
5. Server creates PongGame with both sockets
6. Each client controls one paddle
7. Server broadcasts updates to both clients

**Key Points:**
- Two sockets, one game instance
- Matchmaking queue system
- Each player gets assigned 'player1' or 'player2'
- Game starts when both players are ready
- Handles disconnections gracefully

### 3. Solo Mode (AI)
**Flow:**
1. Client connects and selects "solo" mode
2. Server creates a PongGame instance
3. Player controls player1 paddle
4. Server AI controls player2 paddle
5. Server updates AI position automatically
6. Server broadcasts updates to client

**Key Points:**
- One socket, one game instance
- AI logic runs on server
- Simple AI: follows ball position
- No matchmaking needed

## Message Protocol

### Client → Server

#### Mode Selection
```javascript
{
  type: "selectMode",
  mode: "local" | "remote" | "solo"
}
```

#### Ready Signal
```javascript
{
  type: "ready"
}
```

#### Player Input
```javascript
{
  type: "input",
  playerId: "player1" | "player2",
  direction: "up" | "down"
}
```

#### Leave Queue
```javascript
{
  type: "leaveQueue"
}
```

#### Restart Game
```javascript
{
  type: "restartGame"
}
```

### Server → Client

#### Connection Acknowledgment
```javascript
{
  type: "connected",
  data: {
    connectionId: "conn_123_456",
    timestamp: 1234567890
  }
}
```

#### Queue Status (Remote mode)
```javascript
{
  type: "queueStatus",
  data: {
    status: "waiting",
    position: 1
  }
}
```

#### Match Found (Remote mode)
```javascript
{
  type: "matchFound",
  data: {
    gameId: "remote_123_456",
    yourSide: "player1" | "player2",
    initialState: { ... }
  }
}
```

#### Game Created (Local/Solo mode)
```javascript
{
  type: "gameCreated",
  data: {
    gameId: "local_123_456",
    mode: "local" | "solo",
    initialState: { ... }
  }
}
```

#### Game Started
```javascript
{
  type: "gameStarted",
  data: {
    message: "Game started!",
    state: { ... }
  }
}
```

#### Game Update (60 FPS)
```javascript
{
  type: "update",
  data: {
    gameId: "...",
    mode: "...",
    player1: {
      id: "player1",
      side: "left",
      x: -9,
      z: 0,
      width: 0.5,
      height: 3,
      score: 2
    },
    player2: { ... },
    ball: {
      x: 1.5,
      z: -2.3,
      radius: 0.3
    },
    fieldWidth: 20,
    fieldDepth: 30,
    isRunning: true,
    winner: null
  }
}
```

#### Game End
```javascript
{
  type: "gameEnd",
  data: {
    winner: "player1" | "player2",
    finalScore: {
      player1: 5,
      player2: 3
    }
  }
}
```

#### Opponent Disconnected
```javascript
{
  type: "opponentDisconnected",
  data: {
    message: "Your opponent has disconnected"
  }
}
```

## Key Components

### GameController
- Entry point for all connections
- Creates WebSocketHandler for each client
- Tracks connection statistics

### WebSocketHandler
- Handles messages per connection
- Routes to appropriate services
- Manages connection lifecycle
- Different behavior based on mode

### MatchmakingService (Singleton)
- Manages queue for remote players
- Pairs players automatically
- Creates remote games
- Handles disconnections in remote games
- Cleans up finished games

### PongGame
- Core game logic
- Physics simulation (ball, paddles)
- Collision detection
- Scoring system
- AI logic for solo mode
- 60 FPS game loop
- State broadcasting

### Player
- Position management
- Movement logic
- Score tracking
- Boundary checking

### Ball
- Position and velocity
- Collision response
- Speed increase on paddle hits
- Reset logic

## Data Flow Examples

### Local Game Flow
```
1. Client connects
2. Client → selectMode("local")
3. Server creates PongGame
4. Server → gameCreated
5. Client → ready
6. Server starts game loop
7. Client → input (player1, "up")
8. Server updates player1 position
9. Server → update (60 FPS)
10. Client renders game
```

### Remote Game Flow
```
1. Client A connects
2. Client A → selectMode("remote")
3. Server adds to queue
4. Server → queueStatus
5. Client B connects
6. Client B → selectMode("remote")
7. Server matches A & B
8. Server creates PongGame
9. Server → matchFound (to both)
10. Client A → ready
11. Client B → ready
12. Server starts game loop
13. Client A → input (player1, "up")
14. Server updates player1 position
15. Server → update (to both clients, 60 FPS)
16. Both clients render game
```

## Scalability Considerations

### Current Design
- Single server instance
- In-memory game storage
- Suitable for small-scale deployment

### Future Improvements
1. **Redis for State Management**
   - Store game state in Redis
   - Enable horizontal scaling
   - Persist matchmaking queue

2. **Room-based Architecture**
   - Socket.io rooms for better isolation
   - Easier broadcasting

3. **Load Balancing**
   - Multiple server instances
   - Sticky sessions for WebSocket

4. **Database Integration**
   - Player profiles
   - Match history
   - Leaderboards

## Testing the System

### Test Local Mode
```javascript
const client = new PongClient();
client.connect();
client.selectMode('local');
// After gameCreated
client.ready();
// Send inputs
client.sendInput('player1', 'up');
client.sendInput('player2', 'down');
```

### Test Remote Mode
```javascript
// Client 1
const client1 = new PongClient();
client1.connect();
client1.selectMode('remote');

// Client 2 (in another browser/tab)
const client2 = new PongClient();
client2.connect();
client2.selectMode('remote');

// Both will receive matchFound
// After match, both send ready
client1.ready();
client2.ready();

// Each sends input
client1.sendInput(client1.playerId, 'up');
client2.sendInput(client2.playerId, 'down');
```

### Test Solo Mode
```javascript
const client = new PongClient();
client.connect();
client.selectMode('solo');
// After gameCreated
client.ready();
// Only player1 input matters
client.sendInput('player1', 'up');
// player2 moves automatically (AI)
```

## Error Handling

- Invalid mode selection → error response
- Disconnection during remote game → notify opponent
- Queue abandonment → automatic removal
- Invalid input → ignored
- Game cleanup on errors

## Performance

- **Game Loop:** 60 FPS (16.67ms per frame)
- **Network Updates:** 60 times per second
- **Input Latency:** < 50ms (typical)
- **Matchmaking:** Instant (for 2 players)

## Security Considerations

1. Input validation on all messages
2. Rate limiting (future)
3. Cheating prevention (server authoritative)
4. Connection authentication (future)
5. DDoS protection (future)

## Next Steps

1. Add player authentication
2. Implement ELO rating system
3. Add replay system
4. Create tournament mode
5. Add power-ups
6. Implement spectator mode
7. Add chat system
8. Mobile touch controls
9. Custom game settings (speed, ball size, etc.)
10. Statistics tracking