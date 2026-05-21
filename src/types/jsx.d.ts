declare namespace JSX {
  interface IntrinsicAttributes {
    key?: any;
  }
  interface IntrinsicElements {
    [elementName: string]: any;
  }
}

interface ImportMeta {
  env: Record<string, string | undefined>;
}

interface Window {
  google?: any;
}
