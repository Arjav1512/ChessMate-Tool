import { useLayoutEffect, type RefObject } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll-driven reveal choreography for the marketing landing page.
 *
 * All animation is scoped to `scopeRef` via `gsap.context`, so a single
 * `ctx.revert()` on unmount cleans up every tween and ScrollTrigger. Elements
 * opt in with `data-reveal`:
 *   - "hero"    → entrance timeline, staggered, plays on load
 *   - "section" → fades/slides up once when scrolled into view
 *   - "stagger" → the element's direct children cascade in on scroll
 *
 * Honours `prefers-reduced-motion`: we skip entirely, leaving the markup in its
 * natural (fully visible) state — no `gsap.from` runs, so nothing is hidden.
 */
export function useLandingReveal(scopeRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const root = scopeRef.current;
    if (!root || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Hero — plays immediately, above the fold.
      const heroItems = gsap.utils.toArray<HTMLElement>('[data-reveal="hero"]');
      if (heroItems.length) {
        gsap.from(heroItems, {
          y: 26,
          opacity: 0,
          duration: 0.7,
          ease: 'power3.out',
          stagger: 0.09,
          clearProps: 'transform,opacity',
        });
      }

      // Whole-block sections — reveal once as they enter the viewport.
      gsap.utils.toArray<HTMLElement>('[data-reveal="section"]').forEach((el) => {
        gsap.from(el, {
          y: 34,
          opacity: 0,
          duration: 0.7,
          ease: 'power2.out',
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: el, start: 'top 84%', once: true },
        });
      });

      // Grids — cascade the direct children for a lively but quick reveal.
      gsap.utils.toArray<HTMLElement>('[data-reveal="stagger"]').forEach((grid) => {
        gsap.from(Array.from(grid.children) as HTMLElement[], {
          y: 22,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.08,
          clearProps: 'transform,opacity',
          scrollTrigger: { trigger: grid, start: 'top 86%', once: true },
        });
      });

      // Progress chart — trace the line, then pop the data points on top of it.
      const line = root.querySelector<SVGPathElement>('[data-reveal="chart-line"]');
      if (line) {
        const len = line.getTotalLength();
        const trigger = { trigger: line, start: 'top 85%', once: true } as const;
        gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
        gsap.to(line, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.out', scrollTrigger: trigger });

        const area = root.querySelector<SVGPathElement>('[data-reveal="chart-area"]');
        if (area) gsap.from(area, { opacity: 0, duration: 1, ease: 'power1.out', scrollTrigger: trigger });

        const dots = gsap.utils.toArray<SVGCircleElement>('[data-reveal="chart-dot"]');
        if (dots.length) {
          gsap.from(dots, {
            attr: { r: 0 },
            opacity: 0,
            duration: 0.3,
            ease: 'back.out(2.5)',
            stagger: 0.1,
            delay: 0.35,
            scrollTrigger: trigger,
          });
        }
      }
    }, root);

    return () => ctx.revert();
  }, [scopeRef]);
}

/**
 * One-shot entrance for a focused surface (e.g. the auth card). Gentle rise +
 * fade + faint scale. Reduced-motion users get the element as-is.
 */
export function useEntrance(scopeRef: RefObject<HTMLElement | null>) {
  useLayoutEffect(() => {
    const el = scopeRef.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        y: 18,
        opacity: 0,
        scale: 0.98,
        duration: 0.55,
        ease: 'power3.out',
        clearProps: 'transform,opacity',
      });
    }, el);

    return () => ctx.revert();
  }, [scopeRef]);
}
