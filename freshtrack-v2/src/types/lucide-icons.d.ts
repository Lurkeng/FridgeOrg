/**
 * Type declarations for lucide-react deep ESM imports.
 * Each icon module exports a React component as the default export.
 * Using deep imports keeps each route's icon footprint tree-shakeable.
 */
declare module 'lucide-react/dist/esm/icons/*' {
  import type { FC, SVGProps } from 'react';
  interface IconProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    className?: string;
  }
  const Icon: FC<IconProps>;
  export default Icon;
}
