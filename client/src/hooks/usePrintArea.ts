import { useCallback } from "react";

interface UsePrintAreaOptions {
  background?: string;
  cleanupDelay?: number; // milliseconds
  additionalStyles?: string;
}

export function usePrintArea(
  targetRef: React.RefObject<HTMLElement>,
  options: UsePrintAreaOptions = {}
) {
  const {
    background = "white",
    cleanupDelay = 1000,
    additionalStyles = "",
  } = options;

  return useCallback(() => {
    if (!targetRef.current || !targetRef.current.id) {
      console.error("Target element must have an id attribute for printing.");
      return;
    }

    const id = `print-area-style-${targetRef.current.id}`;

    // Prevent duplicate style tags
    if (document.getElementById(id)) {
      document.getElementById(id)?.remove();
    }

    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden !important;
          background: ${background} !important;
        }
        #${targetRef.current.id}, #${targetRef.current.id} * {
          visibility: visible !important;
        }
        #${targetRef.current.id} {
        }
        ${additionalStyles}
      }
    `;
    document.head.appendChild(style);

    window.print();

    // Cleanup the style after printing
    setTimeout(() => {
      const existing = document.getElementById(id);
      if (existing) existing.remove();
    }, cleanupDelay);
  }, [targetRef, background, cleanupDelay, additionalStyles]);
}
