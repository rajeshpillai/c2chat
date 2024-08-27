import { LoaderFunction, json, useLoaderData, useParams } from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import { authenticator } from "~/services/auth.server";

const prisma = new PrismaClient();

export const loader: LoaderFunction = async ({ request, params }) => {
  const userId = await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });

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

  return json({ recipient });
};

export default function ChatWithUser() {
  const { recipient } = useLoaderData();

  return (
    <div>
      <h2>Chat with {recipient.name || recipient.email}</h2>
      {/* Chat messages and input form go here */}
    </div>
  );
}
