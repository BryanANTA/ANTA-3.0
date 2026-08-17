import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

export default function ProductCard({ product, index }) {
  const mainImage = product.images?.[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
    >
      <Link to={`/product/${product.id}`} className="group block">
        <div className="relative aspect-square bg-secondary rounded-2xl overflow-hidden mb-3">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              referrerPolicy="no-referrer"
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <span className="font-heading text-sm">No Image</span>
            </div>
          )}
          {product.featured && (
            <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground border-0 font-heading text-xs">
              Featured
            </Badge>
          )}
        </div>
        <div className="space-y-1 px-1">
          <p className="text-xs text-muted-foreground font-mono tracking-wider uppercase">
            {product.sku}
          </p>
          <h3 className="font-heading font-semibold text-foreground group-hover:text-accent transition-colors leading-tight">
            {product.name}
          </h3>
          <div className="flex items-center justify-between pt-1">
            {product.price ? (
              <span className="font-heading font-bold text-lg">R{product.price.toFixed(2)}</span>
            ) : (
              <span className="text-muted-foreground text-sm">Price TBD</span>
            )}
            {product.category && (
              <Badge variant="secondary" className="capitalize text-xs font-body">
                {product.category}
              </Badge>
            )}
          </div>
          {product.colors?.length > 0 && (
            <div className="flex items-center gap-1.5 pt-1">
              {product.colors.slice(0, 5).map((color, i) => (
                <div
                  key={i}
                  className="w-3.5 h-3.5 rounded-full border border-border"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
              {product.colors.length > 5 && (
                <span className="text-xs text-muted-foreground">+{product.colors.length - 5}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}