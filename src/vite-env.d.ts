/// <reference types="vite/client" />

// Static asset imports — Vite transforms these into their URL strings at build time.
declare module "*.png" {
  const url: string;
  export default url;
}

declare module "*.jpg" {
  const url: string;
  export default url;
}

declare module "*.jpeg" {
  const url: string;
  export default url;
}

declare module "*.gif" {
  const url: string;
  export default url;
}

declare module "*.webp" {
  const url: string;
  export default url;
}

declare module "*.svg" {
  const url: string;
  export default url;
}
