// app/services/auth.server.ts
import { Authenticator, AuthorizationError } from "remix-auth";
import { sessionStorage } from "~/services/session.server";
import { FormStrategy } from "remix-auth-form";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";


const prisma = new PrismaClient();

// Create an instance of the authenticator, pass a generic with what
// strategies will return and will store in the session
export let authenticator = new Authenticator<User>(sessionStorage, {
  sessionKey: "sessionKey",
  sessionErrorKey: "sessionErrorKey"
});


// Tell the Authenticator to use the form strategy
authenticator.use(
  new FormStrategy(async ({ form }) => {
    let email = form.get("email");
    let password = form.get("password");
    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    //let user = await login(email, password);

    let user = await prisma.user.findUnique({where: {email}});
    console.log("auth:user:", user);
    if (!user) {
      console.log("THROWING ERROR>>>>>>");
      throw new AuthorizationError("Invalid username/password");
    }

    let isValidPassword = await bcrypt.compare(password, user.password);
    console.log("auth:server:isValidPass:", isValidPassword);
    if (!isValidPassword) {
      throw new AuthorizationError("Invalid username/password");
    }

    // the type of this user must match the type you pass to the Authenticator
    // the strategy will automatically inherit the type if you instantiate
    // directly inside the `use` method
    return user.id;
  }),
  // each strategy has a name and can be changed to use another one
  // same strategy multiple times, especially useful for the OAuth2 strategy.
  "user-pass"
);