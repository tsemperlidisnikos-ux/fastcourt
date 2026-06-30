/** Clone a print root into a hidden iframe and print it (WYSIWYG with on-screen preview). */

function collectHeadMarkup(): string {
  const parts: string[] = [];
  document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
    const link = node as HTMLLinkElement;
    if (!link.href) return;
    parts.push(`<link rel="stylesheet" href="${link.href}">`);
  });
  document.querySelectorAll("style").forEach((node) => {
    parts.push(node.outerHTML);
  });
  return parts.join("\n");
}

async function waitForImages(root: ParentNode): Promise<void> {
  const images = [...root.querySelectorAll("img")];
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );
}

function resolvePrintCloneRoot(contentRoot: HTMLElement): HTMLElement {
  const scaleOuter = contentRoot.querySelector<HTMLElement>(
    ".fc-playbook-print-scale-outer",
  );
  return scaleOuter ?? contentRoot;
}

function extractPageStyleFromClone(clone: HTMLElement): string {
  const tag = clone.querySelector("style[data-fc-playbook-print-page]");
  if (!tag) return "";
  const css = tag.textContent ?? "";
  tag.remove();
  return css;
}

/**
 * Print DOM that already matches the on-screen preview.
 * Konva canvases must be converted to images before calling (see installKonvaPrintSnapshots).
 */
export async function printRootInIframe(contentRoot: HTMLElement): Promise<void> {
  const source = resolvePrintCloneRoot(contentRoot);
  const clone = source.cloneNode(true) as HTMLElement;
  const pageStyle = extractPageStyleFromClone(clone);

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = iframe.contentDocument;
  if (!win || !doc) {
    iframe.remove();
    throw new Error("Print iframe unavailable");
  }

  doc.open();
  const pageStyleBlock = pageStyle
    ? `@media print { ${pageStyle} }`
    : `@media print { @page { size: A4 portrait; margin: 0; } }`;
  doc.write(
    `<!DOCTYPE html><html class="fc-playbook-print-iframe"><head><meta charset="utf-8"><base href="${document.baseURI}">${collectHeadMarkup()}<style>
      html, body { margin: 0; padding: 0; background: #fff; color: #000; }
      body { display: block; }
      ${pageStyleBlock}
    </style></head><body>${clone.outerHTML}</body></html>`,
  );
  doc.close();

  await waitForImages(doc.body);
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      win.removeEventListener("afterprint", finish);
      iframe.remove();
      resolve();
    };

    win.addEventListener("afterprint", finish);
    win.focus();
    win.print();
    window.setTimeout(finish, 120_000);
  });
}
