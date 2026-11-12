const DRAG_THRESHOLD = 6;

export function normalizeLoopOffset(offset, loopWidth) {
  if (!(loopWidth > 0)) return 0;
  const phase = ((offset % loopWidth) + loopWidth) % loopWidth;
  return phase === 0 ? -loopWidth : phase - 2 * loopWidth;
}

export function transformX(transform) {
  if (!transform || transform === "none") return 0;
  const values = transform.slice(transform.indexOf("(") + 1, -1).split(",").map(Number);
  if (transform.startsWith("matrix3d")) return values[12] || 0;
  return values[4] || 0;
}

export function bindMarqueeDrag({ marquee, track, getLoopWidth, getDuration, getComputedTransform, onDragStart = () => {}, shouldIgnorePointer = () => false }) {
  let pointer = null;
  let suppressClick = false;
  let suppressedClickPoint = null;
  let keyboardNavigation = false;
  let clickTimer;
  let wheelTimer;

  const getCurrentOffset = () => transformX(getComputedTransform());
  const setOffset = (offset) => {
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
  };

  function resumeAt(offset) {
    const loopWidth = getLoopWidth();
    const duration = getDuration();
    const wrapped = normalizeLoopOffset(offset, loopWidth);
    const fraction = loopWidth > 0 ? Math.max(0, Math.min(1, (-loopWidth - wrapped) / loopWidth)) : 0;
    track.style.animation = "";
    track.style.transform = "";
    track.style.animationDelay = `${-fraction * duration}s`;
    track.style.animationName = "supporter-scroll";
    track.style.animationDuration = `${duration}s`;
    track.style.animationTimingFunction = "linear";
    track.style.animationIterationCount = "infinite";
    track.style.animationPlayState = "";
  }

  function getPhase() {
    const loopWidth = getLoopWidth();
    if (!(loopWidth > 0)) return 0;
    const offset = pointer?.dragging ? pointer.offset : getCurrentOffset();
    const wrapped = normalizeLoopOffset(offset, loopWidth);
    return Math.max(0, Math.min(1, (-loopWidth - wrapped) / loopWidth));
  }

  function resumeAtPhase(phase) {
    const duration = getDuration();
    const normalizedPhase = Math.max(0, Math.min(1, phase));
    track.style.animation = "";
    track.style.transform = "";
    track.style.animationDelay = `${-normalizedPhase * duration}s`;
    track.style.animationName = "supporter-scroll";
    track.style.animationDuration = `${duration}s`;
    track.style.animationTimingFunction = "linear";
    track.style.animationIterationCount = "infinite";
    track.style.animationPlayState = "";
  }

  function clearPointer(released = false, releasePoint = null) {
    if (!pointer) return;
    const current = pointer;
    pointer = null;
    if (current.dragging) {
      marquee.classList.remove("is-dragging");
      if (released) marquee.classList.add("is-drag-release");
      suppressClick = true;
      suppressedClickPoint = releasePoint ? { x: releasePoint.clientX, y: releasePoint.clientY } : null;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { suppressClick = false; suppressedClickPoint = null; }, 500);
    }
    resumeAt(current.offset);
    if (current.captured && marquee.hasPointerCapture?.(current.id)) {
      try { marquee.releasePointerCapture(current.id); } catch { /* Capture may already be lost. */ }
    }
  }

  function onPointerDown(event) {
    if (pointer || shouldIgnorePointer() || event.isPrimary === false || event.button !== 0) return;
    keyboardNavigation = false;
    suppressClick = false;
    suppressedClickPoint = null;
    clearTimeout(clickTimer);
    marquee.classList.remove("is-drag-release");
    const offset = getCurrentOffset();
    pointer = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offset,
      dragging: false,
      captured: false,
    };
    track.style.animation = "none";
    setOffset(offset);
  }

  function onPointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.startX;
    const dy = event.clientY - pointer.startY;
    if (!pointer.dragging) {
      if (Math.abs(dy) > DRAG_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
        clearPointer(false);
        return;
      }
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return;
      pointer.dragging = true;
      marquee.classList.remove("is-drag-release");
      marquee.classList.add("is-dragging");
      onDragStart();
      try {
        marquee.setPointerCapture(event.pointerId);
        pointer.captured = true;
      } catch { /* Window-level pointer events still finish the gesture. */ }
    }
    event.preventDefault();
    pointer.offset = normalizeLoopOffset(pointer.offset + dx, getLoopWidth());
    pointer.startX = event.clientX;
    pointer.startY = event.clientY;
    setOffset(pointer.offset);
  }

  function onPointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    clearPointer(pointer.dragging, event);
  }

  function onPointerCancel(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    clearPointer(pointer.dragging);
  }

  function onLostPointerCapture(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    clearPointer(pointer.dragging);
  }

  function onPointerLeave() {
    if (pointer && !pointer.captured) clearPointer(false);
    if (!pointer) marquee.classList.remove("is-drag-release");
  }

  function onPointerEnter() {
    if (!pointer) marquee.classList.remove("is-drag-release");
  }

  function onClick(event) {
    if (!suppressClick) return;
    if (event.detail === 0) return;
    if (suppressedClickPoint && (Math.abs(event.clientX - suppressedClickPoint.x) > 12 || Math.abs(event.clientY - suppressedClickPoint.y) > 12)) {
      suppressClick = false;
      suppressedClickPoint = null;
      clearTimeout(clickTimer);
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    suppressClick = false;
    suppressedClickPoint = null;
    clearTimeout(clickTimer);
  }

  function onDragStartNative(event) { event.preventDefault(); }
  function onDocumentKeydown(event) {
    if (["Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", " "].includes(event.key)) {
      keyboardNavigation = true;
      marquee.classList.remove("is-drag-release");
    }
  }
  function onFocusIn() {
    marquee.classList.toggle("is-keyboard-focus", keyboardNavigation);
    if (keyboardNavigation) marquee.classList.remove("is-drag-release");
  }

  function onWheel(event) {
    if (shouldIgnorePointer()) return;
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) && !event.shiftKey) return;
    event.preventDefault();
    onDragStart();
    if (pointer) clearPointer(false);
    const delta = (event.deltaX || event.deltaY) * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? marquee.clientWidth : 1);
    const offset = normalizeLoopOffset(getCurrentOffset() - delta, getLoopWidth());
    track.style.animation = "none";
    setOffset(offset);
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => { marquee.classList.add("is-drag-release"); resumeAt(offset); }, 100);
  }
  marquee.addEventListener("wheel", onWheel, { passive: false });
  marquee.addEventListener("focusout", () => marquee.classList.remove("is-keyboard-focus"));
  marquee.addEventListener("pointerdown", onPointerDown);
  marquee.addEventListener("pointermove", onPointerMove);
  marquee.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerCancel);
  marquee.addEventListener("pointercancel", onPointerCancel);
  marquee.addEventListener("lostpointercapture", onLostPointerCapture);
  marquee.addEventListener("pointerleave", onPointerLeave);
  marquee.addEventListener("pointerenter", onPointerEnter);
  marquee.addEventListener("click", onClick, true);
  marquee.addEventListener("dragstart", onDragStartNative);
  marquee.addEventListener("focusin", onFocusIn);
  marquee.ownerDocument?.addEventListener("keydown", onDocumentKeydown, true);

  return {
    cancel() {
      clearTimeout(wheelTimer);
      wheelTimer = undefined;
      if (pointer) clearPointer(pointer.dragging);
    },
    getPhase,
    resumeAtPhase,
    destroy() {
      this.cancel();
      clearTimeout(clickTimer);
      clearTimeout(wheelTimer);
      marquee.removeEventListener("wheel", onWheel);
      marquee.removeEventListener("pointerdown", onPointerDown);
      marquee.removeEventListener("pointermove", onPointerMove);
      marquee.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      marquee.removeEventListener("pointercancel", onPointerCancel);
      marquee.removeEventListener("lostpointercapture", onLostPointerCapture);
      marquee.removeEventListener("pointerleave", onPointerLeave);
      marquee.removeEventListener("pointerenter", onPointerEnter);
      marquee.removeEventListener("click", onClick, true);
      marquee.removeEventListener("dragstart", onDragStartNative);
      marquee.removeEventListener("focusin", onFocusIn);
      marquee.ownerDocument?.removeEventListener("keydown", onDocumentKeydown, true);
    },
  };
}
