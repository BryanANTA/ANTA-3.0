import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Package, LayoutGrid, Plus, ImageUp, Boxes, ClipboardList, Users } from "lucide-react";

export default function Navbar() {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const links = [
    { path: "/", label: "Catalogue", icon: LayoutGrid },
    { path: "/order", label: "Order Sheet", icon: ClipboardList },
    ...(isAdmin ? [
      { path: "/manage", label: "Manage Products", icon: Plus },
      { path: "/import", label: "Import", icon: Package },
      { path: "/images", label: "Images", icon: ImageUp },
      { path: "/stock", label: "Stock", icon: Boxes },
      { path: "/customers", label: "Customers", icon: Users },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <span className="font-black italic tracking-widest text-red-500 text-xl">ANTA</span>
            <span className="font-heading font-bold text-xl tracking-tight">SHOWROOM</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? "bg-white/15 text-white"
                      : "text-white/60 hover:text-white hover:bg-white/10"
                    }`}
                >
                  <link.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
