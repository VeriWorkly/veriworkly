// Polyfills for Node.js production server to support pdfjs-dist without native canvas package.
// pdfjs-dist legacy build requires DOMMatrix, ImageData, and Path2D which are browser APIs.

if (typeof globalThis.DOMMatrix === "undefined") {
  class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;

    constructor(init?: string | number[]) {
      if (typeof init === "string") {
        // Simple parser for basic matrix strings if needed
        const match = init.match(/matrix\(([^)]+)\)/);
        if (match) {
          const parts = match[1].split(",").map(Number);
          if (parts.length === 6) {
            [this.a, this.b, this.c, this.d, this.e, this.f] = parts;
          }
        }
      } else if (Array.isArray(init) && init.length >= 6) {
        [this.a, this.b, this.c, this.d, this.e, this.f] = init;
      }
    }

    multiply() { return this; }
    translate() { return this; }
    scale() { return this; }
    rotate() { return this; }
    inverse() { return this; }
    toString() {
      return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
    }
  }

  Object.defineProperty(globalThis, "DOMMatrix", { value: DOMMatrix });
}

if (typeof globalThis.ImageData === "undefined") {
  class ImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  }

  Object.defineProperty(globalThis, "ImageData", { value: ImageData });
}

if (typeof globalThis.Path2D === "undefined") {
  class Path2D {}
  Object.defineProperty(globalThis, "Path2D", { value: Path2D });
}
