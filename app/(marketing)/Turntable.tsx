"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Turntable.module.css";

type Cover = { releaseId: number; title: string; coverUrl: string };

const SPIN_UP_MS = 350;
const ARM_DROP_MS = 1100;

/**
 * The landing hero: a deck seen from above with a record cued on it, and the
 * shelf of recent additions underneath. Picking a sleeve cues it; the record
 * itself is a link through to that album. Same rows the old marquee used, but
 * every one of them now goes somewhere.
 */
export function Turntable({ covers }: { covers: Cover[] }) {
  const [cuedIndex, setCuedIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [armDown, setArmDown] = useState(false);
  const cued = covers[cuedIndex];
  const hasRecord = covers.length > 0;

  /*
   * Starting is something you watch happen, so the deck arrives at rest: the
   * platter spins up first, then the stylus comes down on it. Picking a new
   * sleeve lifts the arm (see `cue`) and re-runs the same drop.
   */
  useEffect(() => {
    if (!hasRecord) return;
    const spinUp = setTimeout(() => setRunning(true), SPIN_UP_MS);
    const drop = setTimeout(() => setArmDown(true), ARM_DROP_MS);
    return () => {
      clearTimeout(spinUp);
      clearTimeout(drop);
    };
  }, [cuedIndex, hasRecord]);

  function cue(index: number) {
    if (index === cuedIndex) return;
    setArmDown(false);
    setCuedIndex(index);
  }

  return (
    <div className="flex flex-col items-center gap-7">
      <div
        className={`${styles.deck} ${running ? styles.running : ""} ${
          armDown ? styles.armDown : ""
        }`}
      >
        <div className={styles.plinth} />
        <span className={styles.power} />

        <div className={styles.platter}>
          <div className={styles.strobeRing} />
        </div>

        {cued ? (
          <Link
            href={`/album/${cued.releaseId}`}
            className={styles.recordLink}
            aria-label={`Open ${cued.title}`}
          >
            <Record cover={cued} spinning={running} />
            <span className={styles.spindle} />
          </Link>
        ) : (
          <div className={styles.recordLink}>
            <Record cover={null} spinning={false} />
            <span className={styles.spindle} />
          </div>
        )}

        <div className={styles.tonearm}>
          <span className={styles.armHead} />
          <span className={styles.armTube} />
          <span className={styles.armPivot} />
          <span className={styles.counterweight} />
        </div>

        <div className={styles.speeds}>
          <span className={`${styles.speed} ${styles.speedOn}`}>33</span>
          <span className={styles.speed}>45</span>
        </div>

        <div className={styles.pitch}>
          <span className={styles.pitchHandle} />
        </div>
      </div>

      <p
        className="min-h-5 text-center font-mono text-[0.7rem] uppercase tracking-[0.14em] text-room-dim"
        aria-live="polite"
      >
        {cued ? (
          <>
            {armDown ? "Sonando ahora" : "Preparando"} ·{" "}
            <span className="text-room-fg">{cued.title}</span>
          </>
        ) : (
          "Todavía no hay discos en las estanterías"
        )}
      </p>

      {covers.length > 1 && (
        <div className="w-full">
          <p className="mb-3 text-center font-mono text-[0.7rem] uppercase tracking-[0.16em] text-room-dim">
            En las estanterías ahora mismo
          </p>
          <div className="no-scrollbar -mx-6 flex snap-x gap-3 overflow-x-auto px-6">
            {covers.map((cover, index) => (
              <button
                key={cover.releaseId}
                type="button"
                onClick={() => cue(index)}
                aria-label={`Cue ${cover.title}`}
                aria-current={index === cuedIndex}
                className={
                  index === cuedIndex
                    ? "h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xs outline-2 outline-offset-2 outline-room-accent sm:h-20 sm:w-20"
                    : "h-16 w-16 shrink-0 snap-start overflow-hidden rounded-xs opacity-75 transition hover:scale-105 hover:opacity-100 focus-visible:opacity-100 sm:h-20 sm:w-20"
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.coverUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Record({ cover, spinning }: { cover: Cover | null; spinning: boolean }) {
  return (
    <div className={`${styles.record} ${spinning ? styles.spinning : ""}`}>
      <span className={styles.label}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={cover.releaseId} src={cover.coverUrl} alt="" />
        )}
      </span>
    </div>
  );
}
