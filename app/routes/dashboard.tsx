import { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";

// Protect the route with a loader
export let loader: LoaderFunction = async ({ request }) => {
  return await authenticator.isAuthenticated(request, {
    failureRedirect: "/login",
  });
};

export default function Dashboard() {
  let user = useLoaderData();
  return <h1>Welcome to your dashboard, user {user.id}</h1>;
}
