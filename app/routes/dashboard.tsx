import { LoaderFunction } from "@remix-run/node";
import { Form, json, useLoaderData, Outlet } from "@remix-run/react";
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
    where: {
      id: {
        not: user.id,
      }
    },
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
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-1/4 bg-gray-800 text-white p-4">
        <Sidebar users={users} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 relative">
        {/* Logout Button */}
        <Form method="post" action="/logout" className="absolute top-4 right-4">
          <button
            type="submit"
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </Form>

        {/* Welcome Message */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Welcome, {user.email}!</h1>
        </div>

        {/* Outlet for rendering the chat content */}
        <div className="bg-white shadow-md rounded-lg p-4 h-full">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
