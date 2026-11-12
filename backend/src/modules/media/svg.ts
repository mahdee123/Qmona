import { XMLParser } from "fast-xml-parser";

// SVG elements allowed in logos/icons. Anything else (script, foreignObject, iframe, animation elements
// that can set href, ...) is rejected.
const ALLOWED_TAGS = new Set([
  "svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "defs", "lineargradient",
  "radialgradient", "stop", "clippath", "mask", "use", "symbol", "title", "desc", "text", "tspan", "pattern",
  "filter", "fegaussianblur", "feoffset", "feblend", "fecolormatrix", "feflood", "fecomposite", "femerge",
  "femergenode", "femorphology", "fedropshadow", "metadata", "style",
]);
const DANGEROUS_VALUE = /(javascript:|data:text\/html|<\s*script|expression\s*\()/i;
const CSS_IMPORT = /@import|url\(\s*["']?\s*(https?:|\/\/|javascript:)/i;

type Node = Record<string, unknown>;

const local = (name: string) => name.split(":").pop()!.toLowerCase();

/** Throws an Error with a user-facing message when the SVG is not safe to store and serve. */
export function assertSafeSvg(data: Buffer): void {
  const source = data.toString("utf8");
  // Entities and DTDs enable "billion laughs" and external-file attacks; logos never need them.
  if (/<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error("Invalid or unsafe SVG document: DTDs and entities are not allowed.");

  let tree: Node[];
  try {
    const parser = new XMLParser({
      preserveOrder: true,
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      processEntities: false,
      allowBooleanAttributes: false,
    });
    tree = parser.parse(source, true) as Node[];
  } catch {
    throw new Error("Invalid or unsafe SVG document.");
  }

  const roots = tree.filter((n) => Object.keys(n).some((k) => k !== ":@" && !k.startsWith("?") && k !== "#text"));
  const first = roots[0];
  const rootName = first ? Object.keys(first).find((k) => k !== ":@") : undefined;
  if (roots.length !== 1 || !rootName || local(rootName) !== "svg") {
    throw new Error("SVG files must have an <svg> root element.");
  }

  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      const tag = Object.keys(node).find((k) => k !== ":@");
      if (!tag || tag.startsWith("?")) continue;
      if (tag === "#text" || tag === "#comment") continue;
      const name = local(tag);
      if (!ALLOWED_TAGS.has(name)) throw new Error(`SVG element <${name}> is not allowed.`);

      const children = (node[tag] as Node[]) ?? [];
      if (name === "style") {
        const css = children.map((c) => String(c["#text"] ?? "")).join(" ");
        if (CSS_IMPORT.test(css) || DANGEROUS_VALUE.test(css)) {
          throw new Error("SVG <style> blocks may not import or reference external resources.");
        }
      }
      for (const [rawAttr, rawValue] of Object.entries((node[":@"] as Node | undefined) ?? {})) {
        const attr = local(rawAttr.replace(/^@_/, ""));
        const value = String(rawValue ?? "");
        if (attr.startsWith("on")) throw new Error("SVG event-handler attributes are not allowed.");
        if (DANGEROUS_VALUE.test(value)) throw new Error("SVG contains an unsafe attribute value.");
        if (attr === "href" && value && !value.startsWith("#")) {
          throw new Error("SVG links must reference internal fragments only.");
        }
        if (attr === "style" && CSS_IMPORT.test(value)) {
          throw new Error("SVG inline styles may not reference external resources.");
        }
      }
      walk(children);
    }
  };
  walk(tree);
}
