import { cn } from "@/lib/utils";

interface PageSectionProps {
  className?: string;
  children: React.ReactNode;
}

export function PageSection({ className, children }: PageSectionProps) {
  return <section className={cn("mt-8 animate-fade-in-up", className)}>{children}</section>;
}
