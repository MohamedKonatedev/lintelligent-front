type BreadcrumbItem = {
    label: string;
    href?: string;
  };
  
  type Props = {
    items: BreadcrumbItem[];
  };
  
  export default function Breadcrumb({ items }: Props) {
    if (!items.length) return null;
  
    return (
      <nav
        aria-label="Fil d’Ariane"
        className="mx-auto max-w-7xl px-4 pt-6 text-sm text-white/55 sm:px-6 lg:px-8"
      >
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
  
            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span className="text-white/30">/</span>}
  
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="transition hover:text-white"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={isLast ? "text-white" : ""}>{item.label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }