import { ActionFunction, redirect } from "@remix-run/node";
import { Form, Link} from "@remix-run/react";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export let action: ActionFunction = async ({ request }) => {
  let formData = await request.formData();
  let email = formData.get("email");
  let password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return redirect("/register");
  }

  let hashedPassword = await bcrypt.hash(password, 10);

  try {
    await prisma.user.create({
      data: { email, password: hashedPassword },
    });
    return redirect("/login");
  } catch (error) {
    return redirect("/register");
  }
};

// Registration page component
export default function RegisterPage() {
  return (
    <div>
      <h1>Register</h1>
      <Form method="post">
        <label>
          Email:
          <input type="email" name="email" required />
        </label>
        <br />
        <label>
          Password:
          <input type="password" name="password" required />
        </label>
        <br />
        <button type="submit">Register</button>
      </Form>
      <div>
        <p>Already have an account? <Link to="/login">Login here</Link></p>
      </div>
    </div>
  );
}
