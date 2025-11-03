import users from "@/data/users.json";

export function RightSidebar() {
  const contacts = users;
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-16">
        <h2 className="mb-2 text-xs font-medium text-muted-foreground">Contacts</h2>
        <ul className="space-y-1">
          {contacts.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-accent">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
              <span className="truncate text-sm">{u.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}


