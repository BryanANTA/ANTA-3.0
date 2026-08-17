import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function CatalogueLayout() {
  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar />
      <main>
        <Outlet />
      </main>
    </div>
  );
}