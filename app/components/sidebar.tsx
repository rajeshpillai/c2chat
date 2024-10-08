import React from "react";
import { Link } from "@remix-run/react";

interface User {
  id: string;
  name: string;
  email: string;
}

interface SidebarProps {
  users: User[];
}

export default function Sidebar({ users }: SidebarProps) {
  return (
    <div>
      <h2>Users</h2>
      <ul>
        {users.map(user => (
          <li key={user.id}>
            <Link to={`/dashboard/${user.id}`}>{user.name || user.email}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
