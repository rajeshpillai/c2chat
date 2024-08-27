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

uwsApp.ws("/*", {
  open: (ws, req) => {
    console.log("A user connected ", ws.id);
    // Assign a unique id
    activeSockets.push(ws);
    // Send welcome message
    ws.send(JSON.stringify({
      message: "Welcome to cchat!", 
      userId: ws.id
    }));
  },
  message: async (ws, message, isBinary) => {
    let msg;
    try {
      // Convert the message to a string regardless of its type (binary or string)
      const messageString = Buffer.from(message).toString('utf-8');
      // Parse the string as JSON
      msg = JSON.parse(messageString);
    } catch (error) {
      console.error("Failed to parse WebSocket message as JSON:", error);
      return ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
    console.log("ws:MESSAGE: ", msg);

    // Check if the group exists or create one
    let group = await prisma.group.findFirst({
      where: {
        isGroup: false,
        users: {
          every: {
            userId: {
              in: [msg.senderId, msg.recipientId],
            },
          },
        },
      },
    });

    if (!group) {
      group = await prisma.group.create({
        data: {
          name: `Chat between ${msg.senderId} and ${msg.recipientId}`,
          isGroup: false,
          users: {
            create: [
              { userId: msg.senderId },
              { userId: msg.recipientId },
            ],
          },
        },
      });
    }

    // Store the message in DB 
    // Store the message in DB
    const newMessage = await prisma.message.create({
      data: {
        content: msg.content, 
        senderId: msg.senderId,
        groupId: group.id, // Use the created/found group ID
      }
    });

    // Broadcast the message to other users in the same group/chat 
    uwsApp.publish(msg.groupId, JSON.stringify(newMessage));
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

