import { useRef, useState, type KeyboardEvent } from 'react';

import { useLocale } from '../content/locale-context';
import type { RuleBlock, RuleExampleCopy, RulesSectionCopy } from '../content/types';
import { describeCard } from '../content/types';
import { isCourtRank, type Card } from '../domain/cards';
import { Modal } from './Modal';
import { SuitIcon } from './icons';

interface RulesDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onOpenWelcome: () => void;
}

function MiniCard({ card }: { readonly card: Card }) {
  const { content } = useLocale();

  return (
    <span
      className={`rules-card rules-card--${card.suit}`}
      role="img"
      aria-label={describeCard(card, content.cards)}
    >
      <span className="rules-card__corner">
        <span className="rules-card__rank">{content.cards.ranks[card.rank]}</span>
        <SuitIcon suit={card.suit} className="rules-card__suit" />
      </span>
      {isCourtRank(card.rank) && (
        <span className="rules-card__court">{content.cards.court[card.rank]}</span>
      )}
    </span>
  );
}

function Examples({
  items,
  title,
}: {
  readonly items: readonly RuleExampleCopy[];
  readonly title?: string;
}) {
  return (
    <div className="rules-examples">
      {title && <h4 className="rules-block__title">{title}</h4>}
      <ul className="rules-examples__list">
        {items.map((example) => (
          <li className="rules-example" key={example.title}>
            <p className="rules-example__title">{example.title}</p>
            <div className="rules-example__cards">
              {example.cards.map((card) => (
                <MiniCard card={card} key={`${card.rank}-${card.suit}`} />
              ))}
            </div>
            <p className="rules-example__result">{example.result}</p>
            <p className="rules-example__note">{example.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RuleTableView({ block }: { readonly block: Extract<RuleBlock, { kind: 'table' }> }) {
  return (
    <div className="rules-table-wrap">
      {block.title && <h4 className="rules-block__title">{block.title}</h4>}
      <table className="rules-table">
        <thead>
          <tr>
            {block.headers.map((header) => (
              <th scope="col" key={header}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, index) =>
                index === 0 ? (
                  <th scope="row" key={index}>
                    {cell}
                  </th>
                ) : (
                  <td key={index}>{cell}</td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Blocks({ blocks }: { readonly blocks: readonly RuleBlock[] }) {
  const { content } = useLocale();
  const rules = content.rulesDialog;

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'paragraph':
            return (
              <p className="rules-block__paragraph" key={index}>
                {block.text}
              </p>
            );
          case 'list':
            return (
              <div className="rules-block" key={index}>
                {block.title && <h4 className="rules-block__title">{block.title}</h4>}
                <ul className="rules-list">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            );
          case 'table':
            return <RuleTableView block={block} key={index} />;
          case 'examples':
            return <Examples items={block.items} title={block.title} key={index} />;
          case 'callout':
            return (
              <aside className="rules-callout" key={index}>
                {block.title && <p className="rules-callout__title">{block.title}</p>}
                <p className="rules-callout__text">{block.text}</p>
              </aside>
            );
          case 'sources':
            return (
              <div className="rules-block" key={index}>
                <h4 className="rules-block__title">{rules.sourcesLabel}</h4>
                <ul className="rules-sources">
                  {block.items.map((source) => (
                    <li className="rules-source" key={source.href}>
                      <a href={source.href} target="_blank" rel="noreferrer">
                        {source.label}
                      </a>
                      <span>{source.note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          default: {
            const exhaustive: never = block;
            return exhaustive;
          }
        }
      })}
    </>
  );
}

export function RulesDialog({ open, onClose, onOpenWelcome }: RulesDialogProps) {
  const { content } = useLocale();
  const dialog = content.rulesDialog;
  const sections = dialog.sections;
  const [active, setActive] = useState(sections[0]?.id ?? 'mesa');
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const activeIndex = Math.max(
    0,
    sections.findIndex((section) => section.id === active),
  );
  const current = sections[activeIndex] ?? sections[0];

  if (!current) {
    return null;
  }

  const moveTo = (index: number) => {
    const next = sections[(index + sections.length) % sections.length];

    if (!next) {
      return;
    }

    setActive(next.id);
    tabRefs.current.get(next.id)?.focus();
  };

  const handleTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        moveTo(index + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        moveTo(index - 1);
        break;
      case 'Home':
        event.preventDefault();
        moveTo(0);
        break;
      case 'End':
        event.preventDefault();
        moveTo(sections.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="rules-dialog-title"
      closeLabel={dialog.close}
      panelClassName="rules-dialog"
      initialFocus="[role=tab][aria-selected=true]"
    >
      <header className="rules-dialog__head">
        <p className="eyebrow">{dialog.eyebrow}</p>
        <h2 className="rules-dialog__title" id="rules-dialog-title">
          {dialog.title}
        </h2>
        <p className="rules-dialog__lead">{dialog.lead}</p>
      </header>

      <div className="rules-dialog__tabs" role="tablist" aria-label={dialog.tabsLabel}>
        {sections.map((section: RulesSectionCopy, index) => {
          const selected = section.id === active;

          return (
            <button
              type="button"
              role="tab"
              id={`rules-tab-${section.id}`}
              aria-selected={selected}
              aria-controls={`rules-panel-${section.id}`}
              tabIndex={selected ? 0 : -1}
              className={`rules-tab${selected ? ' rules-tab--active' : ''}`}
              key={section.id}
              ref={(node) => {
                if (node) {
                  tabRefs.current.set(section.id, node);
                } else {
                  tabRefs.current.delete(section.id);
                }
              }}
              onClick={() => setActive(section.id)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              {section.tab}
            </button>
          );
        })}
      </div>

      <div
        className="rules-panel"
        role="tabpanel"
        id={`rules-panel-${current.id}`}
        aria-labelledby={`rules-tab-${current.id}`}
        tabIndex={0}
      >
        <h3 className="rules-panel__title">{current.title}</h3>
        <p className="rules-panel__lead">{current.lead}</p>
        <Blocks blocks={current.blocks} />
      </div>

      <footer className="rules-dialog__footer">
        <button type="button" className="rules-dialog__howto" onClick={onOpenWelcome}>
          {dialog.howToPlay}
          <span className="rules-dialog__howto-hint">{dialog.howToPlayHint}</span>
        </button>
        <button type="button" className="button button--primary" onClick={onClose}>
          {dialog.back}
        </button>
      </footer>
    </Modal>
  );
}
