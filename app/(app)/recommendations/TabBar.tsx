import Link from "next/link";

const TABS = [
  { key: "recommendations", label: "Para ti", href: "/recommendations" },
  { key: "explore", label: "Explorar", href: "/explore" },
] as const;

export function TabBar({ active }: { active: "recommendations" | "explore" }) {
  return (
    <nav className="flex gap-6 border-b border-room-rule">
      {TABS.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "-mb-px border-b-2 border-room-accent px-1 pb-2 pt-2 text-sm font-medium text-room-accent"
                : "-mb-px border-b-2 border-transparent px-1 pb-2 pt-2 text-sm text-room-dim hover:text-room-accent active:text-room-accent"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
