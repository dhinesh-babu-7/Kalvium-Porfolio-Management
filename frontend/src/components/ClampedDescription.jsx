import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

/**
 * Clamps text to 4 lines.
 * - `asLink`   -> renders "Read more" as a link to `linkPath`
 * - otherwise  -> renders an inline expand/collapse toggle
 * The toggle only appears when the text actually overflows 4 lines.
 */
export default function ClampedDescription({
  text,
  className = "",
  expandedText = "Read more",
  asLink = false,
  linkPath = "",
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const measure = () => setIsTruncated(el.scrollHeight > el.clientHeight + 1);

    // Element is clamped by default, so overflow here means the text
    // exceeds 4 lines.
    measure();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(measure).catch(() => {});
    }
  }, [text]);

  if (!text) return null;

  // "Read more" navigates to the full project page.
  if (asLink) {
    return (
      <>
        <p ref={textRef} className={`${className} clamped`}>
          {text}
        </p>
        {isTruncated && (
          <Link to={linkPath} className="public-desc-toggle">
            {expandedText}
          </Link>
        )}
      </>
    );
  }

  // Inline expand / collapse toggle.
  return (
    <>
      <p
        ref={textRef}
        className={`${className} ${isExpanded ? "expanded" : "clamped"}`}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          type="button"
          className="public-desc-toggle"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Show less" : expandedText}
        </button>
      )}
    </>
  );
}
