import { LoaderFunction, json, useLoaderData, useParams } from "@remix-run/react";
import {useState, useEffect} from "react";
import { PrismaClient } from "@prisma/client";
import { authenticator } from "~/services/auth.server";

const prisma = new PrismaClient();

function generateGroupId(user1Id, user2Id) {
  // A simple way to generate a consistent ID for both users, regardless of order
  return [user1Id, user2Id].sort().join("-");
}


export const loader: LoaderFunction = async ({ request, params }) => {
  
  const user = await authenticator.isAuthenticated(request);

  console.log("USER: ", user);
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
    console.log("Recipient not found: ", recipientId);
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
      console.log("Sender<->Recipient: ", sender,recipient);
      const groupId = generateGroupId(sender.id, recipient.id);
      console.log("groupId: ", groupId);
      socket = new WebSocket(`ws://localhost:3001/?senderId=${sender.id}&recipientId=${recipient.id}`);

      window.socket = socket;
      socket.onopen = () => {
        console.log("WebSocket connected");
      };

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("Received message: ", message);
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
      <div style={{ border: "1px solid #ccc", padding: "10px", maxHeight: "300px", overflowY: "scroll" }}>
        {messages.map((msg, index) => (
          <div key={index}>
            <strong>{msg.senderId === sender.id ? "You" : recipient.email}:</strong> {msg.content}
          </div>
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
