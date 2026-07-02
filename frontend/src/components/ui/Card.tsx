import { motion } from "framer-motion";
import { cn } from "../../lib/utils";

export function Card({
  className,
  children
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn("glass rounded-3xl p-5 shadow-glow", className)}
    >
      {children}
    </motion.div>
  );
}
