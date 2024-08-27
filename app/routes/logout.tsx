import { ActionFunction, redirect } from "@remix-run/node";
import { authenticator } from "~/services/auth.server";

export const action: ActionFunction = async ({ request }) => {
  return await authenticator.logout(request, { redirectTo: "/login" });
};

export default function Logout() {
  return null; // No need to render anything for the logout action
}
