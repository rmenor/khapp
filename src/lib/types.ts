
import { Timestamp } from 'firebase/firestore';

// Los tipos del dominio de contabilidad (transacciones, resoluciones, meses)
// viven en src/lib/finance/types.ts: ahora se guardan en SQLite local y no
// en Firestore.

export type PioneerTalk = {
    id: string;
    year: number;
    date: Date;
    speaker1: string;
    speaker2: string;
    openingPrayer: string;
    closingPrayer: string;
};

export type FirestorePioneerTalk = Omit<PioneerTalk, 'id' | 'date'> & {
    date: Timestamp;
};

export type SpecialTalk = {
    id: string;
    year: number;
    president: string;
    speaker: string;
    closingPrayer: string;
    auxiliarySpeaker: string;
    date: Date;
};

export type FirestoreSpecialTalk = Omit<SpecialTalk, 'id' | 'date'> & {
    date: Timestamp;
};

export type Memorial = {
    id: string;
    year: number;
    president: string;
    openingPrayer: string;
    speaker: string;
    breadPrayer: string;
    winePrayer: string;
    date: Date;
};

export type FirestoreMemorial = Omit<Memorial, 'id' | 'date'> & {
    date: Timestamp;
};
