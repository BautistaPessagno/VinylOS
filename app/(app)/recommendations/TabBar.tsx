import Link from "next/link";

const TABS = [
  { key: "recommendations", label: "Recommendations", href: "/recommendations" },
  { key: "explore", label: "Explore", href: "/recommendations?tab=explore" },
] as const;

export function TabBar({ active }: { active: "recommendations" | "explore" }) {
  return (
    <nav className="flex gap-6 border-b border-zinc-200 dark:border-zinc-800">
      {TABS.map(({ key, label, href }) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "-mb-px border-b-2 border-red-500 pb-2 text-sm font-medium text-red-500"
                : "-mb-px border-b-2 border-transparent pb-2 text-sm text-zinc-600 hover:text-red-500"
            }
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
