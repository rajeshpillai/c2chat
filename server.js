import { createRequestHandler } from "@remix-run/express";
import compression from "compression";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { PrismaClient } from '@prisma/client';
import { App } from 'uWebSockets.js';

const prisma = new PrismaClient();
const app = express();
const uwsApp = App();

const activeSockets = [];

app.use(cors({
  origin: '*', // Allow all origins; change to specific domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

function generateGroupId(user1Id, user2Id) {
  // A simple way to generate a consistent ID for both users, regardless of order
  return [user1Id, user2Id].sort().join("-");
}


uwsApp.ws("/*", {
  upgrade: (res, req, context) => {
    const url = req.getUrl();
    
    const query = req.getQuery();
    console.log("QUERY: ", query);
    
    const params = new URLSearchParams(query);
    console.log("PARAMS: ", url, params);

    const senderId = params.get('senderId');
    const recipientId = params.get('recipientId');

    console.log(`Received senderId: ${senderId}, recipientId: ${recipientId}`);

    if (!senderId || !recipientId) {
      res.end('Invalid connection parameters');
      return;
    }

    // Fetch or create the group for these two users
    let group = await prisma.group.findFirst({
      where: {
        isGroup: false,
        users: {
          every: {
            userId: {
              in: [senderId, recipientId],
            },
          },
        },
      },
      include: {
        users: true,
      },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          name: `Chat between ${senderId} and ${recipientId}`,
          isGroup: false,
          users: {
            create: [
              { userId: senderId },
              { userId: recipientId },
            ],
          },
        },
      });
    }

    const groupId = group.id;

    //const groupId = generateGroupId(senderId, recipientId);

    console.log("URL: ", url);
    console.log("ws:UPGRADE:groupId", groupId);

    res.upgrade(
      { groupId, senderId, recipientId },
      req.getHeader('sec-websocket-key'),
      req.getHeader('sec-websocket-protocol'),
      req.getHeader('sec-websocket-extensions'),
      context
    );
  },
  open: (ws, req) => {
    console.log("A user connected ", ws.groupId);  // req null is Known thing with uweb.  Use upgrade event
    
    const {groupId} = ws;
    
    // Assign a unique id
    activeSockets.push(ws);

    console.log(`Subscribing to group : ${ws.groupId}`);
    ws.subscribe(ws.groupId);

    // Send welcome message
    ws.send(JSON.stringify({
      message: `Welcome to cchat!  You are subscribed to ${ws.groupId}`, 
      groupId
    }));
  },
  message: async (ws, message, isBinary) => {
    let msg;
    try {
      const messageString = Buffer.from(message).toString('utf-8');
      msg = JSON.parse(messageString);
    } catch (error) {
      console.error("Failed to parse WebSocket message as JSON:", error);
      return ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
    console.log("ws:MESSAGE: ", msg);

    // Store the message in DB
    const newMessage = await prisma.message.create({
      data: {
        content: msg.content,
        senderId: msg.senderId,
        groupId: ws.groupId, // Use the created/found group ID
      }
    });

    console.log("NEW MESSAGE: ", newMessage);

    // Broadcast the message to other users in the same group/chat
    uwsApp.publish(ws.groupId, JSON.stringify(newMessage));
  },
  drain: (ws) => {
    console.log('WebSocket backpressure: ' + ws.getBufferedAmount());
  },
  close: (ws) => {
    console.log("A user disconnected");
  }
});

const viteDevServer =
  process.env.NODE_ENV === "production"
    ? undefined
    : await import("vite").then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        })
      );

const remixHandler = createRequestHandler({
  build: viteDevServer
    ? () => viteDevServer.ssrLoadModule("virtual:remix/server-build")
    : await import("./build/server/index.js"),
});


app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// handle asset requests
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Vite fingerprints its assets so we can cache forever.
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" })
  );
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("build/client", { maxAge: "1h" }));

app.use(morgan("tiny"));

// handle SSR requests
app.all("*", remixHandler);

const port = process.env.PORT || 3000;


app.listen(port, () =>
  console.log(`Express server listening at http://localhost:${port}`)
);

const SOCKET_PORT = 3001;
uwsApp.listen(3001, (token) => {
  if (token) {
    console.log(`Socket server listening on port ${SOCKET_PORT}`);
  } else {
    console.log("Failed to start server");
  }
})

