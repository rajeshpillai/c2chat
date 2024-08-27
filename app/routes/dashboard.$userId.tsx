import { LoaderFunction, json, useLoaderData, useParams } from "@remix-run/react";
import {useState, useEffect} from "react";
import { PrismaClient } from "@prisma/client";
import { authenticator } from "~/services/auth.server";

const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ request, params }) => {
  
  const user = await authenticator.isAuthenticated(request);
  if(!user) {
    return redirect("/login");
  }

  const recipientId = params.userId;

  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: {
      id: true,
      email: true,
    },
  });

  if (!recipient) {
    throw new Response("User not found", { status: 404 });
  }

  return json({ sender: user, recipient });
};

export default function ChatWithUser() {
  const { sender, recipient } = useLoaderData();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  var socket;

  useEffect(() => {
    // Ensure WebSocket is only used client-side
    if (typeof window !== "undefined") {
      console.log("Recipient: ", recipient);
      socket = new WebSocket(`ws://localhost:3001`);
      window.socket = socket;
      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      };

      socket.onclose = () => {
        console.log("WebSocket disconnected");
      };
    }

    // Cleanup function to close the WebSocket connection when the component unmounts
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [recipient.id]);

  const sendMessage = () => {
    if (window.socket && newMessage.trim()) {
      window.socket.send(
        JSON.stringify({
          content: newMessage,
          senderId: sender.id,
          recipientId: recipient.id,
        })
      );
      setNewMessage("");
    }
  };

  return (
    <div>
      <h2>Chat with {recipient.name || recipient.email}</h2>
      <div>
        {messages.map((msg, index) => (
          <div key={index}>{msg.content}</div>
        ))}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
