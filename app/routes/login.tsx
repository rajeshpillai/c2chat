// app/routes/login.tsx
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import  { json } from "@remix-run/node";

import { Form,Link,redirect, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import { authenticator } from "~/services/auth.server";
import {sessionStorage} from "~/services/session.server";


// Second, we need to export an action function, here we will use the
// `authenticator.authenticate method`
export async function action({ request }: ActionFunctionArgs) {
  // we call the method with the name of the strategy we want to use and the
  // request object, optionally we pass an object with the URLs we want the user
  // to be redirected to after a success or a failure
  await authenticator.authenticate("user-pass", request, {
    successRedirect: "/dashboard",
    failureRedirect: "/login",
  });
};

// Finally, we can export a loader function where we check if the user is
// authenticated with `authenticator.isAuthenticated` and redirect to the
// dashboard if it is or return null if it's not
export async function loader({ request }: LoaderFunctionArgs) {
  // If the user is already authenticated redirect to /dashboard directly
  const session = await sessionStorage.getSession(request.headers.get("Cookie"));
  const error = session.get(authenticator.sessionErrorKey);
  
  const userId = await authenticator.isAuthenticated(request);
  if (userId) {
    return redirect("/dashboard");
  }

  return json(
    { error},
    {
      headers: {
        "Set-Cookie": await sessionStorage.commitSession(session),
      }
    }
  )
};

// First we create our UI with the form doing a POST and the inputs with the
// names we are going to use in the strategy
export default function Login() {
  const {error} = useLoaderData();
  console.log("response: ", error);
  return (
    <div>
      {error && <h2 style={{color: "red"}}>{error.message}</h2>}
      <Form method="post">
        <input type="email" name="email" required />
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
        <button type="submit">Sign In</button>
      </Form>
      <div>
        <p>Don't have an account? <Link to="/register">Register here</Link></p>
      </div>
    </div>
  );
}

