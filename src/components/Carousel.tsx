import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  title?: string;
  children: React.ReactNode[];
  itemWidth?: string; // ex: "78vw" (mobile) ou "360px" (desktop)
  showArrows?: boolean;
  showDots?: boolean;
};

export function Carousel({
  title,
  children,
  itemWidth = "78vw",
  showArrows = true,
  showDots = true
}: Props) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  const items = useMemo(() => (Array.isArray(children) ? children : [children]), [children]);
  const count = items.length;

  function scrollToIndex(i: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const clamped = Math.max(0, Math.min(count - 1, i));
    const el = scroller.querySelector(`[data-carousel-index="${clamped}"]`) as HTMLElement | null;
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  }

  function next() { scrollToIndex(index + 1); }
  function prev() { scrollToIndex(index - 1); }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const onScroll = () => {
      const cards = Array.from(scroller.querySelectorAll<HTMLElement>("[data-carousel-index]"));
      if (!cards.length) return;

      // acha o card mais próximo do lado esquerdo do scroller
      const left = scroller.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;

      for (const c of cards) {
        const d = Math.abs(c.getBoundingClientRect().left - left);
        const i = Number(c.dataset.carouselIndex ?? 0);
        if (d < bestDist) { bestDist = d; best = i; }
      }
      setIndex(best);
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => scroller.removeEventListener("scroll", onScroll as any);
  }, [count]);

  if (!count) return null;

  return (
    <div className="carousel">
      {title && <div className="carouselTitle">{title}</div>}

      <div className="carouselFrame">
        {showArrows && count > 1 && (
          <>
            <button className="carouselArrow left" onClick={prev} aria-label="Anterior">‹</button>
            <button className="carouselArrow right" onClick={next} aria-label="Próximo">›</button>
          </>
        )}

        <div className="carouselScroller" ref={scrollerRef}>
          {items.map((node, i) => (
            <div
              key={i}
              className="carouselItem"
              style={{ width: itemWidth }}
              data-carousel-index={i}
            >
              {node}
            </div>
          ))}
        </div>
      </div>

      {showDots && count > 1 && (
        <div className="carouselDots" aria-label="Indicador de páginas">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              className={"dot " + (i === index ? "active" : "")}
              aria-label={`Ir para item ${i + 1}`}
              onClick={() => scrollToIndex(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
