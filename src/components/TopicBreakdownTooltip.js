import React, { useRef, useLayoutEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import TopicIcon from './TopicIcon';

const GAP = 10;
const VIEWPORT_BUFFER = 16;
const PANEL_CHROME = 52;
const TOOLTIP_MAX_WIDTH = 260;
const TOOLTIP_H_INSET = 12;

function computeLayout(anchor) {
  const anchorRect = anchor.getBoundingClientRect();
  const spaceAbove = anchorRect.top - VIEWPORT_BUFFER;
  const spaceBelow = window.innerHeight - anchorRect.bottom - VIEWPORT_BUFFER;

  let placement;
  if (spaceAbove >= spaceBelow && spaceAbove >= 120) {
    placement = 'top';
  } else if (spaceBelow >= 120) {
    placement = 'bottom';
  } else {
    placement = spaceBelow > spaceAbove ? 'bottom' : 'top';
  }

  const available =
    (placement === 'top' ? spaceAbove : spaceBelow) - GAP;

  const panelWidth = Math.min(anchorRect.width - TOOLTIP_H_INSET * 2, TOOLTIP_MAX_WIDTH);
  const left = anchorRect.left + (anchorRect.width - panelWidth) / 2;

  return {
    placement,
    available,
    left,
    width: panelWidth,
    anchorTop: anchorRect.top,
    anchorBottom: anchorRect.bottom,
  };
}

function TopicBreakdownTooltip({ topics = [], anchorRef, visible = false }) {
  const tooltipRef = useRef(null);
  const [layout, setLayout] = useState(null);
  const [top, setTop] = useState(0);
  const [listMaxHeight, setListMaxHeight] = useState(null);

  const refreshLayout = useCallback(() => {
    const anchor = anchorRef?.current;
    if (!anchor) return;
    setLayout(computeLayout(anchor));
  }, [anchorRef]);

  useLayoutEffect(() => {
    if (!visible) {
      setLayout(null);
      setListMaxHeight(null);
      return undefined;
    }

    refreshLayout();

    const onChange = () => refreshLayout();
    window.addEventListener('scroll', onChange, true);
    window.addEventListener('resize', onChange);

    return () => {
      window.removeEventListener('scroll', onChange, true);
      window.removeEventListener('resize', onChange);
    };
  }, [visible, refreshLayout, topics]);

  useLayoutEffect(() => {
    if (!visible || !layout || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const list = tooltip.querySelector('.topic-breakdown-list');
    if (!list) return;

    const maxList = layout.available - PANEL_CHROME;
    const needsScroll = list.scrollHeight > maxList;
    const nextMax = needsScroll ? Math.max(56, maxList) : null;

    if (nextMax !== listMaxHeight) {
      setListMaxHeight(nextMax);
      return;
    }

    const measuredHeight = tooltip.offsetHeight;
    let nextTop;

    if (layout.placement === 'top') {
      nextTop = layout.anchorTop - GAP - measuredHeight;
      nextTop = Math.max(VIEWPORT_BUFFER, nextTop);
    } else {
      nextTop = layout.anchorBottom + GAP;
      const maxBottom = window.innerHeight - VIEWPORT_BUFFER;
      if (nextTop + measuredHeight > maxBottom) {
        nextTop = Math.max(VIEWPORT_BUFFER, maxBottom - measuredHeight);
      }
    }

    setTop(nextTop);
  }, [visible, layout, topics, listMaxHeight]);

  if (!topics.length || !visible || !layout) return null;

  const tooltip = (
    <div
      ref={tooltipRef}
      className={`topic-breakdown-tooltip topic-breakdown-tooltip--portal is-visible${
        layout.placement === 'bottom' ? ' is-below' : ''
      }`}
      style={{
        position: 'fixed',
        top,
        left: layout.left,
        width: layout.width,
        zIndex: 10000,
      }}
      role="tooltip"
    >
      <div className="topic-breakdown-panel">
        <h4 className="topic-breakdown-header">Topic Breakdown</h4>
        <ul
          className={`topic-breakdown-list${listMaxHeight ? ' is-scrollable' : ''}`}
          style={listMaxHeight ? { maxHeight: listMaxHeight } : undefined}
        >
          {topics.map((topic) => (
            <li key={topic.name} className="topic-breakdown-item">
              <span className="topic-breakdown-label">
                <TopicIcon name={topic.name} size={15} />
                <span className="topic-breakdown-name">{topic.name}</span>
              </span>
              <span className="topic-breakdown-count">({topic.questions} Qs)</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return createPortal(tooltip, document.body);
}

export default TopicBreakdownTooltip;
