import * as React from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// Card Component
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "gradient";
  isHoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", isHoverable = false, ...props }, ref) => (
    <motion.div
      whileHover={isHoverable ? { y: -5, transition: { duration: 0.2 } } : {}}
      className={cn(
        "relative overflow-hidden rounded-xl backdrop-blur-sm",
        variant === "default" && "bg-[var(--card-dark)]/90",
        variant === "gradient" && "bg-gradient-to-br from-[var(--primary-blue)]/10 to-[var(--secondary-blue)]/10",
        isHoverable && "transition-all hover:shadow-lg hover:shadow-[var(--primary-blue)]/20",
        className
      )}
      ref={ref}
      {...props}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-[var(--primary-blue)]/20 to-[var(--secondary-blue)]/20" />
      
      {/* Card content */}
      <div className="relative p-6">
        {props.children}
      </div>
    </motion.div>
  )
);
Card.displayName = "Card";

// Card Header
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// Card Content
const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

// Card Footer
const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// Card Title
const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// Card Description
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-sm text-white/60", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

// Single export statement
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
