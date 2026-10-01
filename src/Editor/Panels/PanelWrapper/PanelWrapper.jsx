/*
 * Copyright 2026 Candlestickers
 *
 * This file is part of Candlestick.
 *
 * Candlestick is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Candlestick is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Candlestick. If not, see <https://www.gnu.org/licenses/>.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import DockedPanel from '../DockedPanel/DockedPanel';

function PanelWrapper(props) {

  const [pos, setPos] = useState({ x: props.x || 0, y: props.y || 0 });
  const posRef = useRef(pos);
  posRef.current = pos;

  // which edge of the window we're docked to, and our width (only used when a width prop is given)
  const [dockEdge, setDockEdge] = useState(props.initialEdge || 'top');
  const dockEdgeRef = useRef(dockEdge);
  dockEdgeRef.current = dockEdge;
  const [width, setWidth] = useState(props.width);
  const [height, setHeight] = useState(props.height);

  // visual offsets (panel render will be offset by this many pixels)
  const yOffset = typeof props.yOffset === 'number' ? props.yOffset : 40;
  const xOffset = typeof props.xOffset === 'number' ? props.xOffset : 0;

  // space already taken at the bottom edge by outer panels, so panels docked there stack instead of overlapping
  const bottomInset = props.bottomInset || 0;

  // destructured so the callbacks below can list exactly these as dependencies (calling props.onDock() directly
  // would make the hooks linter ask for the whole props object)
  const { id, onDock, minWidth, maxWidth, minHeight, maxHeight } = props;

  // native drag bookkeeping (mouse)
  const panelRef = useRef(null);
  const nativeDragging = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef({ x: pos.x, y: pos.y });

  // keep a right/bottom docked panel glued to its edge; read through a ref so window listeners always call the latest version
  const stickToEdge = () => {
    if (!panelRef.current) return;

    if (dockEdgeRef.current === 'right') {
      setPos(p => ({ x: window.innerWidth - panelRef.current.offsetWidth - xOffset, y: p.y }));
    } else if (dockEdgeRef.current === 'bottom') {
      setPos(p => ({ x: p.x, y: window.innerHeight - panelRef.current.offsetHeight - yOffset - bottomInset }));
    }
  };
  const stickToEdgeRef = useRef(stickToEdge);
  stickToEdgeRef.current = stickToEdge;

  // re-seat the panel when the offsets or height it depends on change (e.g. the menu bar finishes reporting its size)
  useEffect(() => {
    stickToEdge();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xOffset, yOffset, bottomInset, props.height, height]);

  // where the panel would land if released right now, and which edge that docks it to.
  // Used both for the live preview while dragging and for the real snap on release.
  const getSnapTarget = () => {
    let snappedX = props.x || 0;
    let snappedY = props.y || 0;
    let dock = null;

    if (props.snapTo.includes('top/bottom')) {
      const panelHeight = panelRef.current ? panelRef.current.offsetHeight : 0;
      const bottomY = window.innerHeight - panelHeight - yOffset - bottomInset;

      // snap to whichever edge the panel's top is closer to
      const snappedToBottom = posRef.current.y > (bottomY + (props.y || 0)) / 2;

      snappedY = snappedToBottom ? bottomY : (props.y || 0);

      dock = { edge: snappedToBottom ? 'bottom' : 'top', size: panelHeight };
    }

    if (props.snapTo.includes('left/right')) {
      const panelWidth = panelRef.current ? panelRef.current.offsetWidth : 0;
      const rightX = window.innerWidth - panelWidth - xOffset;

      // snap to whichever edge the panel's left edge is closer to
      const snappedToRight = posRef.current.x > (rightX + (props.x || 0)) / 2;

      snappedX = snappedToRight ? rightX : (props.x || 0);

      if (!dock) dock = { edge: snappedToRight ? 'right' : 'left', size: panelWidth };
    }

    return { x: snappedX, y: snappedY, dock };
  };
  const getSnapTargetRef = useRef(getSnapTarget);
  getSnapTargetRef.current = getSnapTarget;

  // outline of the landing spot, shown while dragging (null when not dragging)
  const [snapPreview, setSnapPreview] = useState(null);

  const onWindowMouseMove = useCallback(e => {
    if (!nativeDragging.current) return;

    const dx = e.clientX - startMouse.current.x;
    const dy = e.clientY - startMouse.current.y;
    let newX = startPos.current.x + dx;
    let newY = startPos.current.y + dy;

    // immediate state update on each mousemove for constant rendering
    setPos({ x: newX, y: newY });

    // posRef only updates on render, so give the preview the position we just computed
    posRef.current = { x: newX, y: newY };
    const target = getSnapTargetRef.current();
    setSnapPreview({
      x: target.x,
      y: target.y,
      width: panelRef.current ? panelRef.current.offsetWidth : 0,
      height: panelRef.current ? panelRef.current.offsetHeight : 0
    });
  }, []);

  const onWindowMouseUp = useCallback(() => {
    if (!nativeDragging.current) return;
    nativeDragging.current = false;

    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);

    document.body.style.userSelect = '';

    setSnapPreview(null);

    const { x: snappedX, y: snappedY, dock } = getSnapTargetRef.current();

    setPos({ x: snappedX, y: snappedY });

    // tell the parent which edge we're docked to so it can resize the space left for other panels
    if (dock) setDockEdge(dock.edge);
    if (dock && id && onDock) onDock(id, dock);

  }, [onWindowMouseMove, id, onDock]);

  // report the starting dock once mounted (top edge by default, or right edge if asked)
  useEffect(() => {
    if (!panelRef.current) return;
    
    if (props.initialEdge === 'right') {
      const panelWidth = panelRef.current.offsetWidth;

      setPos(p => ({ x: window.innerWidth - panelWidth - xOffset, y: p.y }));

      if (props.id && props.onDock) props.onDock(props.id, { edge: 'right', size: panelWidth });
    } else if (props.initialEdge === 'bottom' && props.id && props.onDock) {
      props.onDock(props.id, { edge: 'bottom', size: panelRef.current.offsetHeight });
    } else if (props.id && props.onDock) props.onDock(props.id, { edge: 'top', size: panelRef.current.offsetHeight });

    // stay attached to the right/bottom edge when the window is resized (e.g. opening the dev console)
    const onWindowResize = () => stickToEdgeRef.current();

    window.addEventListener('resize', onWindowResize);

    return () => {
      window.removeEventListener('resize', onWindowResize);

      // the panel is gone (e.g. hidden at small sizes), so stop reserving space for it
      if (props.id && props.onDock) props.onDock(props.id, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // native resize bookkeeping (mouse), for the splitter on a docked panel (width for left/right, height for top/bottom)
  const resizing = useRef(false);
  const resizeStart = useRef({ mouse: 0, size: 0 });
  const [resizeActive, setResizeActive] = useState(false); // highlights the splitter while it is being dragged

  const onResizeMouseMove = useCallback(e => {
    if (!resizing.current) return;

    const edge = dockEdgeRef.current;
    const vertical = edge === 'top' || edge === 'bottom';
    const delta = (vertical ? e.clientY : e.clientX) - resizeStart.current.mouse;

    // a right/bottom docked panel grows as its inner edge moves away from the window edge; a left/top one as it moves towards it
    const wanted = resizeStart.current.size + (edge === 'right' || edge === 'bottom' ? -delta : delta);
    const min = (vertical ? minHeight : minWidth) || 100;
    const max = (vertical ? maxHeight : maxWidth) || Infinity;
    const newSize = Math.min(max, Math.max(min, wanted));

    if (vertical) setHeight(newSize);
    else setWidth(newSize);

    if (edge === 'right') setPos(p => ({ x: window.innerWidth - newSize - xOffset, y: p.y }));
    if (edge === 'bottom') setPos(p => ({ x: p.x, y: window.innerHeight - newSize - yOffset - bottomInset }));
    if (id && onDock) onDock(id, { edge, size: newSize });
  }, [xOffset, yOffset, bottomInset, minWidth, maxWidth, minHeight, maxHeight, id, onDock]);

  const onResizeMouseUp = useCallback(() => {
    resizing.current = false;
    setResizeActive(false);

    window.removeEventListener('mousemove', onResizeMouseMove);
    window.removeEventListener('mouseup', onResizeMouseUp);

    document.body.style.userSelect = '';
  }, [onResizeMouseMove]);

  const onResizeMouseDown = e => {
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    resizing.current = true;
    setResizeActive(true);
    const vertical = dockEdgeRef.current === 'top' || dockEdgeRef.current === 'bottom';
    resizeStart.current = {
      mouse: vertical ? e.clientY : e.clientX,
      size: panelRef.current ? (vertical ? panelRef.current.offsetHeight : panelRef.current.offsetWidth) : 0
    };

    window.addEventListener('mousemove', onResizeMouseMove);
    window.addEventListener('mouseup', onResizeMouseUp);

    document.body.style.userSelect = 'none';
  };

  // remove any lingering listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('mousemove', onResizeMouseMove);
      window.removeEventListener('mouseup', onResizeMouseUp);
      
      document.body.style.userSelect = '';
    };
  }, [onWindowMouseMove, onWindowMouseUp, onResizeMouseMove, onResizeMouseUp]);

  // Capture-phase mousedown to beat other listeners
  const onHandleMouseDownCapture = e => {
    // Only primary mouse button
    if (e.button !== 0) return;

    // The resize splitter has its own handler
    if (e.target.closest('.panel-resize-handle')) return;

    // If the panel has a dedicated drag handle, only start dragging from there
    if (props.dragHandle && !e.target.closest(props.dragHandle)) return;

    // For handles that aren't DOM elements (e.g. a strip drawn on a canvas), the parent decides from the event itself
    if (props.canStartDrag && !props.canStartDrag(e)) return;

    // Let buttons, menus and inputs inside the panel handle their own clicks
    if (e.target.closest('button, a, input, select, textarea, label, [role="button"], [class*="dropdown"]')) return;

    // stop other handlers from interfering
    e.preventDefault();
    e.stopPropagation();

    if (e.nativeEvent && typeof e.nativeEvent.stopImmediatePropagation === 'function') {
      e.nativeEvent.stopImmediatePropagation();
    }

    nativeDragging.current = true;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startPos.current = { x: posRef.current.x, y: posRef.current.y };

    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    // prevent button selection while dragging
    document.body.style.userSelect = 'none';
  };

  // a resizable panel owns its size along the edge it is docked to (width for left/right, height for top/bottom);
  // the other dimension follows the props as they change (e.g. a timeline between two sidebars)
  const sideDocked = dockEdge === 'left' || dockEdge === 'right';
  const shownWidth = props.resizable && sideDocked ? width : props.width;
  const shownHeight = props.resizable && !sideDocked ? height : props.height;

  const wrapperStyle = {
    // fixed so positions are always in window coordinates, whatever the panel's parent looks like
    position: 'fixed',
    left: pos.x + xOffset,
    top: pos.y + yOffset,
    cursor: (props.dragHandle || props.canStartDrag) ? 'default' : 'move',

    // while being dragged, the panel goes above every other panel (and the snap preview, which is just below it)
    zIndex: snapPreview ? 902 : 10,

    // optional fixed size, needed by panels that lay out their children with 100% heights (e.g. reflex containers)
    ...(shownWidth !== undefined && { width: shownWidth }),
    ...(shownHeight !== undefined && { height: shownHeight })
  };

  const sizedStyle = {
    display: 'inline-block',
    verticalAlign: 'top', // removes the small baseline gap below an inline-block, so the wrapper is exactly as tall as its content

    ...(shownWidth !== undefined && { width: '100%' }),
    ...(shownHeight !== undefined && { height: '100%' })
  };

  // splitter sits on the edge facing the rest of the editor
  const resizeHandle = props.resizable && (
    <div
      className={'panel-resize-handle' + (resizeActive ? ' active' : '')}
      onMouseDown={onResizeMouseDown}
      style={sideDocked ? {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 6,
        [dockEdge === 'right' ? 'left' : 'right']: -3,
        cursor: 'col-resize',
        zIndex: 20
      } : {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 6,
        [dockEdge === 'bottom' ? 'top' : 'bottom']: -3,
        cursor: 'row-resize',
        zIndex: 20
      }}
    />
  );

  // small grab bar for panels with no title strip of their own; use with dragHandle=".panel-grip"
  const grip = props.grip && (
    <div
      className="panel-grip"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        height: 20,
        [dockEdge === 'bottom' ? 'top' : 'bottom']: 0,
        cursor: 'grab',
        background: 'transparent',
        zIndex: 15
      }}
    />
  );

  // panelRef lets us measure the panel; dragging is handled by the native mouse handlers above
  const panelContent = (
    <div
      ref={panelRef}
      style={sizedStyle}
    >
      <DockedPanel>{props.children}</DockedPanel>
    </div>
  );

  // translucent outline of where the panel will land, shown while dragging (below the panel itself)
  const snapOverlay = snapPreview && (
    <div
      className="panel-snap-preview"
      style={{
        position: 'fixed',
        left: snapPreview.x + xOffset,
        top: snapPreview.y + yOffset,
        width: snapPreview.width,
        height: snapPreview.height,
        boxSizing: 'border-box',
        border: '2px dashed #FF7867',
        background: 'rgba(255, 119, 101, 0.38)',
        pointerEvents: 'none',
        zIndex: 900 // above the other panels, below the dragged panel (901) and below modals
      }}
    />
  );

  return (
    <>
      {snapOverlay}
      <div
        className="panel-drag-handle"
        style={wrapperStyle}
        onMouseDownCapture={onHandleMouseDownCapture}
      >
        {resizeHandle}
        {grip}
        {panelContent}
      </div>
    </>
  );
}

export default PanelWrapper;