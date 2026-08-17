import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import ImageGallery from "@/components/catalogue/ImageGallery";

export default function ProductDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = window.location.pathname.split("/product/")[1];

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const products = await base44.entities.Product.filter({ id: productId });
      return products[0];
    },
    enabled: !!productId,
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-pulse">
          <div className="aspect-square bg-secondary rounded-2xl" />
          <div className="space-y-4 py-4">
            <div className="h-4 bg-secondary rounded w-24" />
            <div className="h-8 bg-secondary rounded w-64" />
            <div className="h-6 bg-secondary rounded w-32" />
            <div className="h-20 bg-secondary rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h2 className="font-heading font-bold text-2xl mb-2">Product not found</h2>
        <Link to="/" className="text-accent hover:underline">Back to catalogue</Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm font-medium">Back to catalogue</span>
      </Link>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-10"
      >
        <ImageGallery images={product.images} />

        <div className="py-2 space-y-6">
          <div>
            <p className="text-xs text-muted-foreground font-mono tracking-widest uppercase mb-2">
              SKU: {product.sku}
            </p>
            <h1 className="font-heading font-bold text-3xl sm:text-4xl tracking-tight leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-3 mt-3">
              {product.category && (
                <Badge variant="secondary" className="capitalize font-body">{product.category}</Badge>
              )}
              {product.featured && (
                <Badge className="bg-accent text-accent-foreground border-0">Featured</Badge>
              )}
            </div>
          </div>

          {product.price && (
            <p className="font-heading font-bold text-3xl">R{product.price.toFixed(2)}</p>
          )}

          {product.description && (
            <div>
              <h3 className="font-heading font-semibold text-sm tracking-wide uppercase text-muted-foreground mb-2">
                Description
              </h3>
              <p className="text-foreground/80 leading-relaxed">{product.description}</p>
            </div>
          )}

          {product.colors?.length > 0 && (
            <div>
              <h3 className="font-heading font-semibold text-sm tracking-wide uppercase text-muted-foreground mb-3">
                Colors
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color, i) => (
                  <span key={i} className="inline-flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full text-sm">
                    <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: color }} />
                    {color}
                  </span>
                ))}
              </div>
            </div>
          )}

          {product.stock && Object.keys(product.stock).length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading font-semibold text-sm tracking-wide uppercase text-muted-foreground">
                  Stock on Hand
                </h3>
                {typeof product.total_stock === "number" && (
                  <span className={`text-sm font-semibold ${product.total_stock > 0 ? "text-accent" : "text-destructive"}`}>
                    {product.total_stock} units
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(product.stock)
                  .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]) || a[0].localeCompare(b[0]))
                  .map(([size, qty]) => (
                    <span
                      key={size}
                      className={`inline-flex flex-col items-center px-4 py-2 rounded-lg text-sm font-medium border ${
                        qty > 0
                          ? "bg-secondary border-border"
                          : "bg-muted text-muted-foreground border-border line-through"
                      }`}
                    >
                      <span className="font-heading">US {size}</span>
                      <span className={`text-xs ${qty > 0 ? "text-muted-foreground" : ""}`}>{qty} in stock</span>
                    </span>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Sizes shown in US format.</p>
            </div>
          ) : product.sizes?.length > 0 ? (
            <div>
              <h3 className="font-heading font-semibold text-sm tracking-wide uppercase text-muted-foreground mb-3">
                Sizes
              </h3>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size, i) => (
                  <span key={i} className="bg-secondary px-4 py-2 rounded-lg text-sm font-medium">
                    {size}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}