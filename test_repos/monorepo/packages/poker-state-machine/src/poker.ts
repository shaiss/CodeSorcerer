import { Iterable, pipe } from "effect";
import { SUITS, type Card, type CardValue, type HoleCards, type PlayerState } from "./schemas";

export type Deck = Card[];

const ORDERED_HAND_TYPES = [
    "high_card",
    "pair",
    "two_pair",
    "three_kind",
    "straight",
    "flush",
    "full_house",
    "four_kind",
    "straight_flush",
] as const;
export type HandType = (typeof ORDERED_HAND_TYPES)[number]

export type BestHandCards = [Card, Card, Card, Card, Card]
// TODO: make community tuples enforceable on schema level
export type RiverCommunity = [Card, Card, Card, Card, Card]

export type Hand = {
    type: HandType,
    cards: [Card, Card, Card, Card, Card]
}

function fisherYatesShuffle<T>(array: T[]): T[] {
  const clone = [...array];
  for (let i = 0; i < clone.length; ++i) {
    const j = Math.floor(Math.random() * (clone.length - i));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }
  return clone;
}

export function getShuffledDeck(): Deck {
  const deck: Deck = SUITS.flatMap((suit) =>
    Array.from({ length: 13 }).map((_, index) => ({
      suit,
      rank: (index + 1) as CardValue,
    })),
  );

  return fisherYatesShuffle(deck);
}

// is there a neatier way to implement this?
function combinations<T>(array: T[], k: number): T[][] {
  const result: T[][] = [];

  function combine(current: T[], start: number): void {
    if (current.length === k) {
      result.push([...current]);
      return;
    }

    for (let i = start; i < array.length; i++) {
      current.push(array[i]);
      combine(current, i + 1);
      current.pop();
    }
  }

  combine([], 0);
  return result;
}

function compareHands(a: Hand, b: Hand): -1 | 0 | 1 {
    const indexA = ORDERED_HAND_TYPES.findIndex(ht => ht == a.type)
    const indexB = ORDERED_HAND_TYPES.findIndex(ht => ht == a.type)

    if (indexA <  indexB) return -1
    if (indexA >  indexB) return +1

    // FIXME: implement untie criteria (way trickier than I first thought)
    return 0
}

// FIXME: this incorrectly determines: fullhouse, straight with king-ace, two pair
export function determineHandType(cards: BestHandCards): HandType {
  const sorted = cards.sort();

  const subsequentDiffs = sorted.map((card, index) =>
    index < sorted.length - 1 ? sorted[index + 1].rank - card.rank : 1,
  );

  const cardsByValue = cards.reduce(
    (count, card) => ({
      ...count,
      [card.rank]: (count[card.rank] ?? 0) + 1,
    }),
    {} as { [v: number]: number },
  );

  const cardsBySuit = cards.reduce(
    (count, card) => ({ ...count, [card.suit]: (count[card.suit] ?? 0) + 1 }),
    {} as { [v: string]: number },
  );

  const isStraight = subsequentDiffs.every(v => v === 1);
  const isFlush = Object.values(cardsBySuit).some(c => c >= 4);
  const isFourKind = Object.values(cardsByValue).some(c => c === 4);
  const isThreeKind = Object.values(cardsByValue).some(c => c === 3);
  // TODO: const isTwoPair
  const isPair = Object.values(cardsByValue).some(c => c === 2);

  if (isStraight && isFlush) return "straight_flush"
  if (isFourKind) return "four_kind"
  // FIXME: this is broken because isThreeKind implies isPair
  if (isThreeKind && isPair) return "full_house"
  if (isFlush) return "flush"
  if (isStraight) return "straight"
  if (isThreeKind) "three_kind"
  if (isPair) return "pair"

  return "high_card"
}

export function getBestHand(community: RiverCommunity, hole: HoleCards): Hand {
    const combs = combinations([...community, ...hole], 5) as BestHandCards[]
    const hands = combs.map(cards => ({
        type: determineHandType(cards),
        cards,
    }))

    // TODO: just get max instead (somehow)
    return hands.toSorted(compareHands)[0]
}

// gets player ids and hole cards, together with community (assuming river as it is showdown) and
// returns the list of player ids which won this pot (singleton in case of no ties)
export function determineWinningPlayers(
    players: PlayerState[],
    community: RiverCommunity
): string[] {
    // get each players best hand and sort in descending order
    const playerHands = players
        .map(({ id, hand }) => ({ id, hand: getBestHand(community, hand) }))
        .toSorted((a, b) => compareHands(b.hand, a.hand))

    return pipe(
        playerHands,
        Iterable.groupWith((a, b) => compareHands(a.hand, b.hand) === 0),
        Iterable.take(1),
        Iterable.flatten,
        Iterable.map(p => p.id),
        Iterable.reduce<string[], string>([], (acc, id) => [...acc ,id])
    )
}
