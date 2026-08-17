import { motion } from "framer-motion";
import { Minus } from "lucide-react";

export default function OrderProductCard({ product, index, order, onAdd, onDec }) {
  const stock = product.stock || {};
  const inStock = Object.entries(stock).filter(([, q]) => q > 0);
  const mainImage = product.images?.[0];
  const qtyFor = (size) => order[`${product.sku}|${size}`]?.qty || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: (index % 12) * 0.03 }}
      className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col"
    >
      <div className="aspect-square bg-secondary">
        {mainImage ? (
          <img src={mainImage} alt={product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-xs font-mono text-muted-foreground">{product.sku}</p>
        <h3 className="font-heading font-medium text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {product.name || product.sku}
        </h3>
        {product.price ? <p className="text-sm font-semibold mt-1"><span className="text-muted-foreground font-normal text-xs mr-1">RRP</span>R{product.price.toFixed(2)}</p> : null}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {inStock.length === 0 && <span className="text-xs text-muted-foreground">Out of stock</span>}
          {inStock.map(([size]) => {
            const qty = qtyFor(size);
            return (
              <div key={size} className="flex items-center border border-border rounded-lg overflow-hidden">
                {qty > 0 && (
                  <button onClick={() => onDec(product, size)} className="px-1 py-1 hover:bg-secondary">
                    <Minus className="w-3 h-3" />
                  </button>
                )}
                <button
                  onClick={() => onAdd(product, size)}
                  className={`px-2 py-1 text-xs font-medium ${qty > 0 ? "bg-accent text-accent-foreground" : "hover:bg-secondary"}`}
                >
                  US {size}{qty > 0 ? ` ×${qty}` : ""}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}