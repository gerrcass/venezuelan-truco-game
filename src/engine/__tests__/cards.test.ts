import { cardKey, SPANISH_DECK, type Card, type Rank, type Suit } from '../../domain/cards';
import { SEATS, type Seat } from '../../domain/seats';

import { cardPower, compareCards, envidoTanto, pieceOf } from '../cards';

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA_REY_BASTO = card(12, 'basto');

describe('the Spanish deck', () => {
  it('has 40 unique cards with no 8 or 9', () => {
    const keys = SPANISH_DECK.map(cardKey);

    expect(SPANISH_DECK).toHaveLength(40);
    expect(new Set(keys).size).toBe(40);
    expect(SPANISH_DECK.some((entry) => [8, 9].includes(entry.rank))).toBe(false);
  });
});

describe('the vira pieces', () => {
  const cases: ReadonlyArray<{
    readonly viraRank: Rank;
    readonly pericoRank: Rank;
    readonly pericaRank: Rank;
  }> = [
    { viraRank: 1, pericoRank: 11, pericaRank: 10 },
    { viraRank: 2, pericoRank: 11, pericaRank: 10 },
    { viraRank: 3, pericoRank: 11, pericaRank: 10 },
    { viraRank: 4, pericoRank: 11, pericaRank: 10 },
    { viraRank: 5, pericoRank: 11, pericaRank: 10 },
    { viraRank: 6, pericoRank: 11, pericaRank: 10 },
    { viraRank: 7, pericoRank: 11, pericaRank: 10 },
    { viraRank: 12, pericoRank: 11, pericaRank: 10 },
    { viraRank: 10, pericoRank: 11, pericaRank: 12 },
    { viraRank: 11, pericoRank: 12, pericaRank: 10 },
  ];

  it.each(cases)(
    'turns the right court cards for a vira of $viraRank',
    ({ viraRank, pericoRank, pericaRank }) => {
      const vira = card(viraRank, 'espada');

      expect(pieceOf(card(pericoRank, 'espada'), vira)).toBe('perico');
      expect(pieceOf(card(pericaRank, 'espada'), vira)).toBe('perica');
    },
  );

  it('ignores court cards of another palo and the vira itself', () => {
    expect(pieceOf(card(11, 'oro'), VIRA_REY_BASTO)).toBeNull();
    expect(pieceOf(card(12, 'basto'), VIRA_REY_BASTO)).toBeNull();

    const viraSota = card(10, 'copa');

    expect(pieceOf(viraSota, viraSota)).toBeNull();
  });
});

describe('the card hierarchy', () => {
  const table: ReadonlyArray<{
    readonly power: number;
    readonly card: Card;
    readonly name: string;
  }> = [
    { power: 100, card: card(11, 'basto'), name: 'perico' },
    { power: 99, card: card(10, 'basto'), name: 'perica' },
    { power: 90, card: card(1, 'espada'), name: 'espadilla' },
    { power: 89, card: card(1, 'basto'), name: 'bastillo' },
    { power: 88, card: card(7, 'espada'), name: 'siete de espada' },
    { power: 87, card: card(7, 'oro'), name: 'siete de oro' },
    { power: 80, card: card(3, 'oro'), name: 'tres' },
    { power: 70, card: card(2, 'copa'), name: 'dos' },
    { power: 60, card: card(1, 'oro'), name: 'as falso' },
    { power: 50, card: card(12, 'oro'), name: 'rey' },
    { power: 40, card: card(11, 'oro'), name: 'caballo' },
    { power: 30, card: card(10, 'oro'), name: 'sota' },
    { power: 20, card: card(7, 'copa'), name: 'siete falso' },
    { power: 15, card: card(6, 'espada'), name: 'seis' },
    { power: 14, card: card(5, 'espada'), name: 'cinco' },
    { power: 13, card: card(4, 'espada'), name: 'cuatro' },
  ];

  it('matches the rules table from perico down to four', () => {
    for (const row of table) {
      expect(cardPower(row.card, VIRA_REY_BASTO), row.name).toBe(row.power);
    }

    expect(table.map((row) => row.power)).toEqual(
      [...table].map((row) => row.power).sort((a, b) => b - a),
    );
  });

  it('ties equal ranks and compares the rest in the right direction', () => {
    expect(cardPower(card(3, 'espada'), VIRA_REY_BASTO)).toBe(
      cardPower(card(3, 'copa'), VIRA_REY_BASTO),
    );
    expect(compareCards(card(11, 'basto'), card(1, 'espada'), VIRA_REY_BASTO)).toBe(1);
    expect(compareCards(card(1, 'espada'), card(11, 'basto'), VIRA_REY_BASTO)).toBe(-1);
    expect(compareCards(card(3, 'oro'), card(3, 'copa'), VIRA_REY_BASTO)).toBe(0);
  });

  it('promotes the rey when the vira is a caballo', () => {
    const vira = card(11, 'espada');

    expect(cardPower(card(12, 'espada'), vira)).toBe(100);
    expect(cardPower(card(10, 'espada'), vira)).toBe(99);
  });

  it('drops burned cards below every face-up card and ties only burned cards', () => {
    expect(cardPower(card(4, 'oro'), VIRA_REY_BASTO, true)).toBe(-1);
    expect(compareCards(card(4, 'oro'), card(4, 'copa'), VIRA_REY_BASTO, true, true)).toBe(0);
    expect(compareCards(card(12, 'oro'), card(4, 'espada'), VIRA_REY_BASTO, false, true)).toBe(1);
    expect(compareCards(card(4, 'espada'), card(12, 'oro'), VIRA_REY_BASTO, true, false)).toBe(-1);
  });
});

describe('the envido tanto', () => {
  it('counts a piece with only the highest companion', () => {
    expect(envidoTanto([card(11, 'basto'), card(7, 'oro'), card(4, 'copa')], VIRA_REY_BASTO)).toBe(
      37,
    );
    expect(envidoTanto([card(10, 'basto'), card(7, 'oro'), card(6, 'oro')], VIRA_REY_BASTO)).toBe(
      36,
    );
  });

  it('counts the best pair, or the highest card with no pair', () => {
    expect(envidoTanto([card(7, 'oro'), card(6, 'oro'), card(4, 'copa')], VIRA_REY_BASTO)).toBe(33);
    expect(envidoTanto([card(12, 'copa'), card(3, 'basto'), card(1, 'oro')], VIRA_REY_BASTO)).toBe(
      3,
    );
    expect(envidoTanto([card(12, 'copa'), card(11, 'oro'), card(10, 'oro')], VIRA_REY_BASTO)).toBe(
      20,
    );
  });
});

describe('the seats', () => {
  it('are four distinct seats in counterclockwise order', () => {
    expect(SEATS).toEqual([0, 1, 2, 3]);
    expect(SEATS.map((seat: Seat) => seat)).toHaveLength(4);
  });
});
