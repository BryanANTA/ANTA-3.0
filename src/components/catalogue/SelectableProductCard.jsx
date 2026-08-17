import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function SelectableProductCard({ product, index, selected, onToggle, selectionMode }) {
  const mainImage = product.images?.[0];

  const stock = product.stock || {};
  const inStockSizes = Object.keys(stock).filter((s) => stock[s] > 0);
  const sizesToShow = inStockSizes.length ? inStockSizes : (product.sizes || []);
  const hasStockData = typeof product.total_stock === "number";

  const handleClick = (e) => {
    if (selectionMode) {
      e.preventDefault();
      onToggle(product.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="relative"
    >
      {selectionMode && (
        <button
          onClick={() => onToggle(product.id)}
          className={`absolute top-3 right-3 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
            selected
              ? "bg-accent border-accent text-white"
              : "bg-white/80 border-border"
          }`}
        >
          {selected && <CheckCircle2 className="w-4 h-4" />}
        </button>
      )}

      <Link
        to={`/product/${product.id}`}
        onClick={handleClick}
        className={`group block ${selected ? "ring-2 ring-accent rounded-2xl" : ""}`}
      >
        <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden mb-3">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="font-heading text-sm">No Image</span>
            </div>
          )}

        </div>
        <div className="px-1 pt-2 space-y-0.5">
          <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground capitalize">
            {product.gender && <span>{product.gender}</span>}
            {product.gender && product.category && <span>·</span>}
            {product.category && <span>{product.category}</span>}
          </div>
          <h3 className="font-heading font-medium text-foreground group-hover:text-accent transition-colors leading-tight text-sm pt-0.5">
            {product.name || product.sku}
          </h3>
          {sizesToShow.length > 0 && (
            <p className="text-xs text-muted-foreground">{sizesToShow.join(" · ")}</p>
          )}
          {hasStockData && (
            <p className={`text-xs font-medium ${product.total_stock > 0 ? "text-accent" : "text-destructive"}`}>
              {product.total_stock > 0 ? `${product.total_stock} in stock` : "Out of stock"}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}