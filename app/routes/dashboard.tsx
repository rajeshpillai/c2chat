import { LoaderFunction } from "@remix-run/node";
import { Form, json, useLoaderData } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";

import Sidebar from "~/components/sidebar";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Protect the route with a loader
export let loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  if(!user) {
    return redirect("/login");
  }

  // Fetch the list of users
  console.log("FOUND: USERID: ", user);
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
    },
  });

  return json({user, users });
  
};

export default function Dashboard() {
  let  {user, users} = useLoaderData();
  return (
    <div>
      <h1>Welcome, {user.email}!</h1>
      <p>User ID: {user.id}</p>
      <Form method="post" action="/logout">
        <button type="submit">Logout</button>
      </Form>

      <Sidebar users={users} />
      
    </div>
  );
}
